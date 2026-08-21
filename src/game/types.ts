export type Overlay = "title" | "select" | "none" | "paused" | "dead" | "won" | "score" | "board";
export type DeathReason = "spike" | "pit" | "arrow" | "saw" | "drip" | null;
export type AnimName = "idle" | "run" | "jump" | "fall";

export type PlatformKind = "solid" | "oneway" | "moving" | "timed" | "slick" | "bounce";
export type LevelTheme = "moss" | "ember" | "indigo" | "ash" | "thorn" | "cinder";
export type PlatformSprite = "moss" | "raft" | "stone" | "wood" | "iron";
export type CheckpointStyle = "lantern" | "censer" | "brazier";
export type HazardKind = "spike" | "turret" | "saw" | "spout";

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
  sprite: PlatformSprite;
  move?: Mover;
  timer?: { period: number; duty: number; phase: number };
  crumble?: Crumble;
  squash?: number;
  prevX: number;
  prevY: number;
}

export interface Hazard {
  kind: HazardKind;
  x: number;
  y: number;
  w: number;
  h: number;
  dir?: { x: number; y: number };
  interval?: number;
  cool?: number;
  move?: Mover;
  style?: "bramble" | "iron";
  prevX?: number;
  prevY?: number;
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
  style?: CheckpointStyle;
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
  kind: "dust" | "spark" | "burst" | "confetti";
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
  drips: Bolt[];
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
