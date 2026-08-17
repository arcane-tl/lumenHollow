import { create } from "zustand";
import type { DeathReason, HudSnapshot, Overlay } from "./types";
import { loadMuted } from "./audio";
import { loadSave, type SaveData, type ScoreEntry } from "./save";

interface GameStore extends HudSnapshot {
  save: SaveData;
  cloudByLevel: Record<number, ScoreEntry[]>;
  setOverlay: (overlay: Overlay) => void;
  patch: (partial: Partial<HudSnapshot> & { cloudByLevel?: Record<number, ScoreEntry[]> }) => void;
  applySave: (save: SaveData) => void;
}

const initial = loadSave();

export const useGameStore = create<GameStore>((set) => ({
  overlay: "title",
  levelId: 0,
  levelName: "Moss Steps",
  coins: 0,
  totalCoins: 8,
  deaths: 0,
  deathReason: null as DeathReason,
  unlocked: initial.unlocked,
  best: initial.best,
  runTime: 0,
  lastRank: null,
  muted: loadMuted(),
  ready: true,
  doubleReady: true,
  save: initial,
  cloudByLevel: {},
  setOverlay: (overlay) => set({ overlay }),
  patch: (partial) => set(partial),
  applySave: (save) => set({ save, unlocked: save.unlocked, best: save.best }),
}));
