-- Run this in the Supabase SQL editor (once). Safe to re-run.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  level_id int not null check (level_id between 0 and 99),
  name text not null check (char_length(name) between 1 and 12),
  coins int not null check (coins between 0 and 32),
  time_ms int not null check (time_ms between 500 and 7200000),
  created_at timestamptz not null default now()
);

-- Existing projects were limited to Act 1 (0–9). Widen for Act 2+.
alter table public.scores drop constraint if exists scores_level_id_check;
alter table public.scores add constraint scores_level_id_check check (level_id between 0 and 99);

create index if not exists scores_board_idx
  on public.scores (level_id, coins desc, time_ms asc);

alter table public.scores enable row level security;

drop policy if exists "scores_read" on public.scores;
create policy "scores_read"
  on public.scores for select
  using (true);

drop policy if exists "scores_insert" on public.scores;
create policy "scores_insert"
  on public.scores for insert
  with check (
    char_length(name) between 1 and 12
    and coins between 0 and 32
    and time_ms between 500 and 7200000
    and level_id between 0 and 99
  );
