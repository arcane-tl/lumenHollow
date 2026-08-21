import { LAST_LEVEL_ID } from "./constants";
import { SCORE_LIMIT, sortScores, type ScoreEntry } from "./scores";

const cache = new Map<number, ScoreEntry[]>();

export type SubmitResult = { ok: boolean; rank: number | null; board: ScoreEntry[] | null };

function env(name: string) {
  const v = (import.meta as { env?: Record<string, string | undefined> }).env?.[name];
  return typeof v === "string" ? v.trim() : "";
}

export function cloudConfig() {
  const url = env("VITE_SUPABASE_URL").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const key = env("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  return { url, key };
}

export function isCloudOn() {
  return !!cloudConfig();
}

export function cachedScores(levelId: number): ScoreEntry[] | null {
  return cache.get(levelId) ?? null;
}

function headers(key: string, extra?: Record<string, string>) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function rowToEntry(row: {
  name?: string;
  coins?: number;
  time_ms?: number;
  created_at?: string;
}): ScoreEntry {
  return {
    name: String(row.name ?? "FOX")
      .toUpperCase()
      .replace(/[^A-Z0-9._-]/g, "")
      .slice(0, 18) || "FOX",
    coins: Number(row.coins) || 0,
    time: Math.max(0, (Number(row.time_ms) || 0) / 1000),
    at: row.created_at ? Date.parse(row.created_at) : Date.now(),
  };
}

function remember(levelId: number, list: ScoreEntry[]) {
  cache.set(levelId, list);
  return list;
}

async function request(
  url: string,
  key: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, headers: headers(key, init.headers as Record<string, string>), signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTable(levelId: number, timeoutMs: number): Promise<ScoreEntry[] | null> {
  const cfg = cloudConfig();
  if (!cfg) return null;
  const q = new URL(`${cfg.url}/rest/v1/scores`);
  q.searchParams.set("select", "id,name,coins,time_ms,created_at");
  q.searchParams.set("level_id", `eq.${levelId}`);
  q.searchParams.set("order", "coins.desc,time_ms.asc,created_at.asc,id.asc");
  q.searchParams.set("limit", String(SCORE_LIMIT));
  const res = await request(q.toString(), cfg.key, { method: "GET" }, timeoutMs);
  if (!res.ok) return null;
  const rows = (await res.json()) as { name?: string; coins?: number; time_ms?: number; created_at?: string }[];
  if (!Array.isArray(rows)) return null;
  return sortScores(rows.map(rowToEntry));
}

export async function fetchLevelScores(levelId: number): Promise<ScoreEntry[] | null> {
  const cfg = cloudConfig();
  if (!cfg) return null;
  const id = Math.max(0, Math.min(LAST_LEVEL_ID, Math.round(levelId)));
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await request(
        `${cfg.url}/rest/v1/rpc/top_scores`,
        cfg.key,
        { method: "POST", body: JSON.stringify({ p_level: id }) },
        2500,
      );
      if (res.status === 404) {
        const table = await fetchTable(id, 2500);
        return table ? remember(id, table) : null;
      }
      if (!res.ok) {
        if (attempt === 0) {
          await sleep(200);
          continue;
        }
        return null;
      }
      const rows = (await res.json()) as { name?: string; coins?: number; time_ms?: number; created_at?: string }[];
      if (!Array.isArray(rows)) return null;
      return remember(id, sortScores(rows.map(rowToEntry)));
    } catch {
      if (attempt === 0) {
        await sleep(200);
        continue;
      }
      return null;
    }
  }
  return null;
}

function parseSubmitPayload(data: unknown): { rank: number; board: ScoreEntry[] } | null {
  if (!data || typeof data !== "object") return null;
  const row = data as { rank?: number; board?: unknown };
  const rank = Number(row.rank);
  if (!Array.isArray(row.board)) return null;
  const board = sortScores(
    row.board.map((item) => rowToEntry((item ?? {}) as { name?: string; coins?: number; time_ms?: number; created_at?: string })),
  );
  return { rank: Number.isFinite(rank) ? rank : board.length, board };
}

export async function submitLevelScore(
  levelId: number,
  name: string,
  coins: number,
  time: number,
): Promise<SubmitResult> {
  const cfg = cloudConfig();
  if (!cfg) return { ok: false, rank: null, board: null };
  const id = Math.max(0, Math.min(LAST_LEVEL_ID, Math.round(levelId)));
  const safeName = name.replace(/[^A-Z0-9._-]/gi, "").toUpperCase().slice(0, 18) || "FOX";
  const timeMs = Math.round(Math.max(0.5, time) * 1000);
  const body = JSON.stringify({
    p_level: id,
    p_name: safeName,
    p_coins: Math.max(0, Math.round(coins)),
    p_time_ms: timeMs,
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await request(
        `${cfg.url}/rest/v1/rpc/submit_score`,
        cfg.key,
        { method: "POST", body },
        3000,
      );
      if (res.status === 404) {
        const posted = await postLegacy(id, safeName, coins, timeMs);
        if (!posted) {
          if (attempt < 2) {
            await sleep(250 * (attempt + 1));
            continue;
          }
          return { ok: false, rank: null, board: cache.get(id) ?? null };
        }
        const board = await fetchTable(id, 2500);
        if (board) remember(id, board);
        return { ok: true, rank: null, board: board ?? cache.get(id) ?? null };
      }
      if (!res.ok) {
        if (attempt < 2) {
          await sleep(250 * (attempt + 1));
          continue;
        }
        return { ok: false, rank: null, board: cache.get(id) ?? null };
      }
      const parsed = parseSubmitPayload(await res.json());
      if (!parsed) return { ok: false, rank: null, board: cache.get(id) ?? null };
      remember(id, parsed.board);
      return { ok: true, rank: parsed.rank, board: parsed.board };
    } catch {
      if (attempt < 2) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      return { ok: false, rank: null, board: cache.get(id) ?? null };
    }
  }
  return { ok: false, rank: null, board: cache.get(id) ?? null };
}

async function postLegacy(levelId: number, name: string, coins: number, timeMs: number): Promise<boolean> {
  const cfg = cloudConfig();
  if (!cfg) return false;
  const res = await request(
    `${cfg.url}/rest/v1/scores`,
    cfg.key,
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        level_id: levelId,
        name,
        coins: Math.max(0, Math.round(coins)),
        time_ms: timeMs,
      }),
    },
    3000,
  );
  return res.ok;
}

export async function postLevelScore(levelId: number, name: string, coins: number, time: number): Promise<boolean> {
  const result = await submitLevelScore(levelId, name, coins, time);
  return result.ok;
}
