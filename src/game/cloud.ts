import { LAST_LEVEL_ID } from "./constants";
import { SCORE_LIMIT, sortScores, type ScoreEntry } from "./scores";

const cache = new Map<number, ScoreEntry[]>();

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

function rowToEntry(row: { name?: string; coins?: number; time_ms?: number; created_at?: string }): ScoreEntry {
  return {
    name: String(row.name ?? "FOX").slice(0, 12),
    coins: Number(row.coins) || 0,
    time: Math.max(0, (Number(row.time_ms) || 0) / 1000),
    at: row.created_at ? Date.parse(row.created_at) : Date.now(),
  };
}

export async function fetchLevelScores(levelId: number): Promise<ScoreEntry[] | null> {
  const cfg = cloudConfig();
  if (!cfg) return null;
  const q = new URL(`${cfg.url}/rest/v1/scores`);
  q.searchParams.set("select", "name,coins,time_ms,created_at");
  q.searchParams.set("level_id", `eq.${levelId}`);
  q.searchParams.set("order", "coins.desc,time_ms.asc");
  q.searchParams.set("limit", String(SCORE_LIMIT));
  try {
    const res = await fetch(q, { headers: headers(cfg.key) });
    if (!res.ok) return cache.get(levelId) ?? null;
    const rows = (await res.json()) as { name?: string; coins?: number; time_ms?: number; created_at?: string }[];
    const list = sortScores(rows.map(rowToEntry));
    cache.set(levelId, list);
    return list;
  } catch {
    return cache.get(levelId) ?? null;
  }
}

export async function postLevelScore(levelId: number, name: string, coins: number, time: number): Promise<boolean> {
  const cfg = cloudConfig();
  if (!cfg) return false;
  const id = Math.max(0, Math.min(LAST_LEVEL_ID, Math.round(levelId)));
  const safeName = name.replace(/[^A-Z0-9 ._\-]/gi, "").trim().toUpperCase().slice(0, 12) || "FOX";
  const timeMs = Math.round(Math.max(0.5, time) * 1000);
  try {
    const res = await fetch(`${cfg.url}/rest/v1/scores`, {
      method: "POST",
      headers: headers(cfg.key, { Prefer: "return=minimal" }),
      body: JSON.stringify({
        level_id: id,
        name: safeName,
        coins: Math.max(0, Math.round(coins)),
        time_ms: timeMs,
      }),
    });
    if (!res.ok) return false;
    cache.delete(id);
    await fetchLevelScores(id);
    return true;
  } catch {
    return false;
  }
}
