export type Overlay = "title" | "select" | "none" | "paused" | "dead" | "won" | "score" | "board";
export type DeathReason = "spike" | "pit" | "arrow" | null;
export type AnimName = "idle" | "run" | "jump" | "fall";

export type PlatformKind = "solid" | "oneway" | "moving" | "timed";
export type LevelTheme = "moss" | "ember" | "indigo" | "ash";

export interface Mover {
  axis: "x" | "y";
  a: number;
  b: number;
  speed: number;
  phase: number;
}

export interface Crumble {
  delay: number;
  blockTime: number;
  rebuild: number;
  blocks: number;
  gone: number;
  wait: number;
  phase: "idle" | "hold" | "fall" | "gone";
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatformKind;
  sprite: "moss" | "raft" | "stone";
  move?: Mover;
  timer?: { period: number; duty: number; phase: number };
  crumble?: Crumble;
  prevX: number;
  prevY: number;
}

export interface Hazard {
  kind: "spike" | "turret";
  x: number;
  y: number;
  w: number;
  h: number;
  dir?: { x: number; y: number };
  interval?: number;
  cool?: number;
}

export interface Bolt {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  life: number;
  skipX?: number;
  skipY?: number;
  skipW?: number;
  skipH?: number;
}

export interface Coin {
  x: number;
  y: number;
  r: number;
  taken: boolean;
  bob: number;
}

export interface Checkpoint {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
}

export interface Flag {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "dust" | "spark" | "burst";
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  coyote: number;
  jumpBuffer: number;
  jumpsLeft: number;
  jumpCut: boolean;
  jumpGrace: number;
  jumpLock: number;
  dropThrough: number;
  ride: Platform | null;
  anim: AnimName;
  animTime: number;
  invuln: number;
  deadTimer: number;
  airTime: number;
  spawnX: number;
  spawnY: number;
}

export interface LevelDef {
  id: number;
  name: string;
  blurb: string;
  theme?: LevelTheme;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  platforms: Array<Omit<Platform, "prevX" | "prevY"> & { prevX?: number; prevY?: number }>;
  hazards: Hazard[];
  coins: Array<Omit<Coin, "taken" | "bob"> & { taken?: boolean; bob?: number }>;
  checkpoints: Array<Omit<Checkpoint, "active"> & { active?: boolean }>;
  flag: Flag;
}

export interface World {
  id: number;
  name: string;
  theme: LevelTheme;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  platforms: Platform[];
  hazards: Hazard[];
  bolts: Bolt[];
  coins: Coin[];
  checkpoints: Checkpoint[];
  flag: Flag;
}

export interface Camera {
  x: number;
  y: number;
  shake: number;
  look: number;
}

export interface Actions {
  moveX: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  downHeld: boolean;
  pausePressed: boolean;
  restartPressed: boolean;
}

export interface HudSnapshot {
  overlay: Overlay;
  levelId: number;
  levelName: string;
  coins: number;
  totalCoins: number;
  deaths: number;
  deathReason: DeathReason;
  unlocked: number[];
  best: Record<number, number>;
  runTime: number;
  lastRank: number | null;
  muted: boolean;
  ready: boolean;
  doubleReady: boolean;
}
