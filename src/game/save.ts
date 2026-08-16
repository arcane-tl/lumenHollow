import { LAST_LEVEL_ID, SAVE_KEY } from "./constants";
import { LEVELS } from "./levels";
import {
  cleanName,
  sortScores,
  wouldRankList,
  previewRankList,
  type ScoreEntry,
} from "./scores";

export type { ScoreEntry } from "./scores";
export { SCORE_LIMIT, NAME_MAX, compareScores, formatTime, cleanName } from "./scores";

const LEGACY_KEYS = ["lumen-hollow-v1"];

export interface SaveData {
  version: 4;
  unlocked: number[];
  best: Record<number, number>;
  scores: Record<string, ScoreEntry[]>;
  stamps: Record<string, string>;
  lastName: string;
}

function allLevelIds() {
  return Array.from({ length: LAST_LEVEL_ID + 1 }, (_, i) => i);
}

export function levelStamp(id: number): string {
  const lvl = LEVELS[id];
  if (!lvl) return "";
  const plats = lvl.platforms.map((p) => `${p.kind}:${p.x | 0}:${p.y | 0}:${p.w | 0}`).join(",");
  const haz = lvl.hazards.map((h) => `${h.kind}:${h.x | 0}:${h.w | 0}`).join(",");
  return `${lvl.name}|${lvl.width}|${lvl.coins.length}|${plats}|${haz}`;
}

function currentStamps() {
  const stamps: Record<string, string> = {};
  for (const id of allLevelIds()) stamps[String(id)] = levelStamp(id);
  return stamps;
}

function pruneChangedLevels(
  scores: Record<string, ScoreEntry[]>,
  best: Record<number, number>,
  prev: Record<string, string> | undefined,
) {
  const nextScores = { ...scores };
  const nextBest = { ...best };
  if (!prev) return { scores: nextScores, best: nextBest };
  for (const id of allLevelIds()) {
    const key = String(id);
    const now = levelStamp(id);
    if (prev[key] && prev[key] !== now) {
      delete nextScores[key];
      delete nextBest[id];
    }
  }
  return { scores: nextScores, best: nextBest };
}

export function emptySave(): SaveData {
  return {
    version: 4,
    unlocked: allLevelIds(),
    best: {},
    scores: {},
    stamps: currentStamps(),
    lastName: "",
  };
}

export function scoresFor(save: SaveData, levelId: number): ScoreEntry[] {
  return sortScores(save.scores[String(levelId)] ?? []);
}

export function wouldRank(save: SaveData, levelId: number, coins: number, time: number) {
  return wouldRankList(save.scores[String(levelId)] ?? [], coins, time);
}

export function previewRank(save: SaveData, levelId: number, coins: number, time: number) {
  return previewRankList(save.scores[String(levelId)] ?? [], coins, time);
}

function readRaw(): string | null {
  const primary = window.localStorage.getItem(SAVE_KEY);
  if (primary) return primary;
  for (const key of LEGACY_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (raw) return raw;
  }
  return null;
}

export function loadSave(): SaveData {
  const empty = emptySave();
  if (typeof window === "undefined") return empty;
  try {
    const raw = readRaw();
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<SaveData> & { version?: number };
    const pruned = pruneChangedLevels(parsed.scores ?? {}, parsed.best ?? {}, parsed.stamps);
    const next: SaveData = {
      version: 4,
      unlocked: allLevelIds(),
      best: pruned.best,
      scores: pruned.scores,
      stamps: currentStamps(),
      lastName: typeof parsed.lastName === "string" ? parsed.lastName : "",
    };
    writeSave(next);
    return next;
  } catch {
    return empty;
  }
}

export function writeSave(data: SaveData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function recordClear(id: number, coins: number, save: SaveData): SaveData {
  const best = { ...save.best, [id]: Math.max(save.best[id] ?? 0, coins) };
  const next: SaveData = {
    version: 4,
    unlocked: allLevelIds(),
    best,
    scores: save.scores,
    stamps: save.stamps ?? currentStamps(),
    lastName: save.lastName,
  };
  writeSave(next);
  return next;
}

export function recordScore(
  save: SaveData,
  levelId: number,
  coins: number,
  time: number,
  name: string,
): { save: SaveData; rank: number; entry: ScoreEntry } {
  const entry: ScoreEntry = { name: cleanName(name, save.lastName || "Fox"), coins, time, at: Date.now() };
  const key = String(levelId);
  const nextList = sortScores([...(save.scores[key] ?? []), entry]);
  const rank = nextList.findIndex((row) => row === entry) + 1;
  const next: SaveData = {
    ...recordClear(levelId, coins, save),
    scores: { ...save.scores, [key]: nextList },
    lastName: entry.name,
  };
  writeSave(next);
  return { save: next, rank, entry };
}
