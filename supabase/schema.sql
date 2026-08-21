-- Run this in the Supabase SQL editor (once). Safe to re-run.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  level_id int not null check (level_id between 0 and 99),
  name text not null,
  coins int not null check (coins between 0 and 32),
  time_ms int not null check (time_ms between 500 and 7200000),
  created_at timestamptz not null default now()
);

-- Existing projects were limited to Act 1 (0–9). Widen for Act 2+.
alter table public.scores drop constraint if exists scores_level_id_check;
alter table public.scores add constraint scores_level_id_check check (level_id between 0 and 99);

alter table public.scores drop constraint if exists scores_name_check;
update public.scores
set name = coalesce(
  nullif(substr(regexp_replace(upper(name), '[^A-Z0-9._-]', '', 'g'), 1, 18), ''),
  'FOX'
);
alter table public.scores add constraint scores_name_check check (
  char_length(name) between 1 and 18
  and name ~ '^[A-Z0-9._-]+$'
);

drop index if exists public.scores_board_idx;
create index scores_board_idx
  on public.scores (level_id, coins desc, time_ms asc, created_at asc, id asc);

alter table public.scores enable row level security;

drop policy if exists "scores_read" on public.scores;
create policy "scores_read"
  on public.scores for select
  using (true);

drop policy if exists "scores_insert" on public.scores;
create policy "scores_insert"
  on public.scores for insert
  with check (
    char_length(name) between 1 and 18
    and name ~ '^[A-Z0-9._-]+$'
    and coins between 0 and 32
    and time_ms between 500 and 7200000
    and level_id between 0 and 99
  );

-- One-round-trip board + submit. Re-run this file after deploy.
create or replace function public.top_scores(p_level int)
returns table(id bigint, name text, coins int, time_ms int, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.coins, s.time_ms, s.created_at
  from public.scores s
  where s.level_id = p_level
  order by s.coins desc, s.time_ms asc, s.created_at asc, s.id asc
  limit 10;
$$;

create or replace function public.submit_score(
  p_level int,
  p_name text,
  p_coins int,
  p_time_ms int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_rank int;
  v_board jsonb;
  v_name text;
begin
  if p_level is null or p_level < 0 or p_level > 99 then
    raise exception 'bad level';
  end if;
  if p_coins is null or p_coins < 0 or p_coins > 32 then
    raise exception 'bad coins';
  end if;
  if p_time_ms is null or p_time_ms < 500 or p_time_ms > 7200000 then
    raise exception 'bad time';
  end if;

  v_name := upper(trim(coalesce(p_name, '')));
  v_name := regexp_replace(v_name, '[^A-Z0-9._-]', '', 'g');
  v_name := substr(v_name, 1, 18);
  if v_name is null or char_length(v_name) < 1 then
    v_name := 'FOX';
  end if;

  select s.id into v_id
  from public.scores s
  where s.level_id = p_level
    and s.name = v_name
    and s.coins = p_coins
    and s.time_ms = p_time_ms
    and s.created_at > now() - interval '10 seconds'
  order by s.id desc
  limit 1;

  if v_id is null then
    insert into public.scores (level_id, name, coins, time_ms)
    values (p_level, v_name, p_coins, p_time_ms)
    returning id into v_id;
  end if;

  select r.ord into v_rank
  from (
    select s.id, row_number() over (
      order by s.coins desc, s.time_ms asc, s.created_at asc, s.id asc
    ) as ord
    from public.scores s
    where s.level_id = p_level
  ) r
  where r.id = v_id;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_board
  from (
    select s.id, s.name, s.coins, s.time_ms, s.created_at
    from public.scores s
    where s.level_id = p_level
    order by s.coins desc, s.time_ms asc, s.created_at asc, s.id asc
    limit 10
  ) t;

  return jsonb_build_object('id', v_id, 'rank', coalesce(v_rank, 11), 'board', v_board);
end;
$$;

grant execute on function public.top_scores(int) to anon, authenticated;
grant execute on function public.submit_score(int, text, int, int) to anon, authenticated;
