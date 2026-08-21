export const SCORE_LIMIT = 10;
export const NAME_MAX = 18;

export interface ScoreEntry {
  name: string;
  coins: number;
  time: number;
  at: number;
}

export function compareScores(
  a: Pick<ScoreEntry, "coins" | "time"> & { at?: number },
  b: Pick<ScoreEntry, "coins" | "time"> & { at?: number },
) {
  if (b.coins !== a.coins) return b.coins - a.coins;
  if (a.time !== b.time) return a.time - b.time;
  return (a.at ?? 0) - (b.at ?? 0);
}

export function formatTime(seconds: number) {
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function cleanName(raw: string, fallback = "FOX") {
  const scrub = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9._-]/g, "").slice(0, NAME_MAX);
  return scrub(raw) || scrub(fallback) || "FOX";
}

export function sortScores(list: ScoreEntry[]) {
  return [...list].sort(compareScores).slice(0, SCORE_LIMIT);
}

export function wouldRankList(list: ScoreEntry[], coins: number, time: number) {
  const ranked = sortScores(list);
  if (ranked.length < SCORE_LIMIT) return true;
  return compareScores({ coins, time }, ranked[ranked.length - 1]) < 0;
}

export function previewRankList(list: ScoreEntry[], coins: number, time: number) {
  const ranked = sortScores(list);
  let rank = 1;
  for (const row of ranked) {
    if (compareScores({ coins, time }, row) < 0) break;
    rank += 1;
  }
  return rank;
}
