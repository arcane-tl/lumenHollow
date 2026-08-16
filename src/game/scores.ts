export const SCORE_LIMIT = 10;
export const NAME_MAX = 16;

export interface ScoreEntry {
  name: string;
  coins: number;
  time: number;
  at: number;
}

export function compareScores(a: Pick<ScoreEntry, "coins" | "time">, b: Pick<ScoreEntry, "coins" | "time">) {
  if (b.coins !== a.coins) return b.coins - a.coins;
  return a.time - b.time;
}

export function formatTime(seconds: number) {
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function cleanName(raw: string, fallback = "Fox") {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
  return name || fallback;
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
