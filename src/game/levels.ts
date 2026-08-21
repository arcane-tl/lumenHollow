import { PLAYER_H, PLAYER_W } from "./constants";
import type { Checkpoint, Hazard, LevelDef, Platform, World } from "./types";

const GROUND = 468;
const SPIKE_H = 50;

function onGround(x: number, w: number): Hazard {
  return { kind: "spike", x, y: GROUND - SPIKE_H, w, h: SPIKE_H };
}

function onPlat(x: number, surfaceY: number, w: number): Hazard {
  return { kind: "spike", x, y: surfaceY - SPIKE_H, w, h: SPIKE_H };
}

function lantern(x: number, surfaceY: number): Omit<Checkpoint, "active"> {
  return { x, y: surfaceY - 54, w: 20, h: 54, style: "lantern" };
}

function censer(x: number, surfaceY: number): Omit<Checkpoint, "active"> {
  return { x, y: surfaceY - 54, w: 20, h: 54, style: "censer" };
}

function brazier(x: number, surfaceY: number): Omit<Checkpoint, "active"> {
  return { x, y: surfaceY - 54, w: 22, h: 54, style: "brazier" };
}

function brambleOn(x: number, w: number): Hazard {
  return { kind: "spike", style: "bramble", x, y: GROUND - SPIKE_H, w, h: SPIKE_H };
}

function bramblePlat(x: number, surfaceY: number, w: number): Hazard {
  return { kind: "spike", style: "bramble", x, y: surfaceY - SPIKE_H, w, h: SPIKE_H };
}

function millSaw(
  x: number,
  y: number,
  axis: "x" | "y",
  a: number,
  b: number,
  speed = 1.2,
  phase = 0,
): Hazard {
  return {
    kind: "saw",
    x,
    y,
    w: 36,
    h: 36,
    move: { axis, a, b, speed, phase },
    prevX: x,
    prevY: y,
  };
}

function dripSpout(x: number, y: number, interval = 1.5, delay = 0.2): Hazard {
  return { kind: "spout", x: x - 18, y, w: 36, h: 70, interval, cool: delay };
}

function timed(x: number, y: number, w: number, ..._rest: number[]): Omit<Platform, "prevX" | "prevY"> {
  const blocks = Math.max(3, Math.round(w / 26));
  return {
    x,
    y,
    w,
    h: 22,
    kind: "timed",
    sprite: "moss",
    crumble: { delay: 0.5, blockTime: 0.13, rebuild: 2.5, blocks, gone: 0, wait: 0, phase: "idle" },
  };
}

function turret(
  x: number,
  surfaceY: number,
  facing: "left" | "right" | "up" | "down",
  interval = 1.75,
  delay = 0.4,
): Hazard {
  const dir =
    facing === "left"
      ? { x: -1, y: 0 }
      : facing === "right"
        ? { x: 1, y: 0 }
        : facing === "up"
          ? { x: 0, y: -1 }
          : { x: 0, y: 1 };
  if (facing === "down") {
    return { kind: "turret", x: x - 4, y: surfaceY - 6, w: 32, h: 6, dir, interval, cool: delay };
  }
  return { kind: "turret", x: x - 4, y: surfaceY - 26, w: 34, h: 26, dir, interval, cool: delay };
}

export const LEVELS: LevelDef[] = [
  {
    id: 0,
    name: "Moss Steps",
    blurb: "Learn the hollow. Jump the brook. Light the first lantern.",
    theme: "moss",
    width: 3200,
    height: 540,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 940, h: 80, kind: "solid", sprite: "moss" },
      { x: 260, y: 396, w: 168, h: 26, kind: "solid", sprite: "moss" },
      { x: 1120, y: GROUND, w: 2080, h: 80, kind: "solid", sprite: "moss" },
      { x: 960, y: 378, w: 200, h: 24, kind: "solid", sprite: "moss" },
      { x: 1480, y: 338, w: 148, h: 24, kind: "solid", sprite: "moss" },
      {
        x: 1860,
        y: 318,
        w: 152,
        h: 22,
        kind: "moving",
        sprite: "raft",
        move: { axis: "x", a: 1760, b: 2020, speed: 0.7, phase: 0 },
      },
      { x: 2508, y: 336, w: 108, h: 24, kind: "oneway", sprite: "raft" },
    ],
    hazards: [onGround(2192, 152)],
    coins: [
      { x: 310, y: 352, r: 11 },
      { x: 368, y: 352, r: 11 },
      { x: 1040, y: 336, r: 11 },
      { x: 1288, y: 286, r: 11 },
      { x: 1536, y: 296, r: 11 },
      { x: 1940, y: 274, r: 11 },
      { x: 2388, y: 372, r: 11 },
      { x: 2920, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1320, GROUND)],
    flag: { x: 3040, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 1,
    name: "Spike Hollow",
    blurb: "Pits, spikes, and a long ride. Double-jump earns the high ledge.",
    theme: "moss",
    width: 3680,
    height: 540,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 500, h: 80, kind: "solid", sprite: "moss" },
      { x: 540, y: 382, w: 148, h: 24, kind: "solid", sprite: "moss" },
      { x: 760, y: 292, w: 124, h: 24, kind: "solid", sprite: "moss" },
      { x: 980, y: GROUND, w: 420, h: 80, kind: "solid", sprite: "moss" },
      { x: 1288, y: 352, w: 156, h: 24, kind: "oneway", sprite: "raft" },
      {
        x: 1540,
        y: 330,
        w: 140,
        h: 22,
        kind: "moving",
        sprite: "raft",
        move: { axis: "y", a: 230, b: 400, speed: 0.65, phase: 0.4 },
      },
      {
        x: 1800,
        y: 276,
        w: 140,
        h: 22,
        kind: "moving",
        sprite: "raft",
        move: { axis: "x", a: 1680, b: 2020, speed: 0.8, phase: 1.2 },
      },
      { x: 2180, y: GROUND, w: 1500, h: 80, kind: "solid", sprite: "moss" },
      { x: 2220, y: 338, w: 160, h: 24, kind: "solid", sprite: "moss" },
      { x: 2680, y: 292, w: 128, h: 24, kind: "solid", sprite: "moss" },
      { x: 3020, y: 368, w: 176, h: 24, kind: "oneway", sprite: "raft" },
    ],
    hazards: [onGround(1024, 132), onGround(2500, 136), onGround(2768, 128)],
    coins: [
      { x: 580, y: 340, r: 11 },
      { x: 800, y: 248, r: 11 },
      { x: 1188, y: 372, r: 11 },
      { x: 1340, y: 310, r: 11 },
      { x: 1570, y: 188, r: 11 },
      { x: 1860, y: 232, r: 11 },
      { x: 2280, y: 296, r: 11 },
      { x: 2720, y: 248, r: 11 },
      { x: 3080, y: 326, r: 11 },
      { x: 3400, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1236, GROUND), lantern(2384, GROUND)],
    flag: { x: 3520, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 2,
    name: "Sky Rafters",
    blurb: "The floor falls away. Ride the rafts to the last lantern.",
    theme: "moss",
    width: 4040,
    height: 600,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 360, h: 80, kind: "solid", sprite: "moss" },
      { x: 430, y: 390, w: 140, h: 24, kind: "solid", sprite: "moss" },
      { x: 680, y: 310, w: 132, h: 24, kind: "oneway", sprite: "raft" },
      { x: 940, y: 248, w: 120, h: 24, kind: "solid", sprite: "moss" },
      {
        x: 1200,
        y: 300,
        w: 148,
        h: 22,
        kind: "moving",
        sprite: "raft",
        move: { axis: "y", a: 210, b: 390, speed: 0.7, phase: 0 },
      },
      { x: 1500, y: 268, w: 168, h: 24, kind: "solid", sprite: "moss" },
      { x: 1760, y: 340, w: 240, h: 24, kind: "solid", sprite: "moss" },
      {
        x: 2060,
        y: 280,
        w: 150,
        h: 22,
        kind: "moving",
        sprite: "raft",
        move: { axis: "x", a: 1940, b: 2320, speed: 0.75, phase: 0.8 },
      },
      { x: 2480, y: 300, w: 136, h: 24, kind: "oneway", sprite: "raft" },
      { x: 2760, y: 230, w: 120, h: 24, kind: "solid", sprite: "moss" },
      { x: 3040, y: 318, w: 168, h: 24, kind: "solid", sprite: "moss" },
      { x: 3360, y: 390, w: 160, h: 24, kind: "oneway", sprite: "raft" },
      { x: 3660, y: GROUND, w: 380, h: 80, kind: "solid", sprite: "moss" },
    ],
    hazards: [onPlat(1888, 340, 96), onGround(3730, 90)],
    coins: [
      { x: 470, y: 348, r: 11 },
      { x: 720, y: 268, r: 11 },
      { x: 980, y: 206, r: 11 },
      { x: 1230, y: 176, r: 11 },
      { x: 1540, y: 226, r: 11 },
      { x: 2120, y: 236, r: 11 },
      { x: 2520, y: 258, r: 11 },
      { x: 2800, y: 188, r: 11 },
      { x: 3400, y: 348, r: 11 },
      { x: 3688, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1564, 268)],
    flag: { x: 3888, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 3,
    name: "Bolt Walk",
    blurb: "Iron mouths wake. Jump the first volley.",
    theme: "ember",
    width: 2920,
    height: 540,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 560, h: 80, kind: "solid", sprite: "moss" },
      { x: 680, y: 390, w: 168, h: 24, kind: "solid", sprite: "stone" },
      { x: 1020, y: 390, w: 180, h: 24, kind: "solid", sprite: "stone" },
      { x: 1320, y: GROUND, w: 780, h: 80, kind: "solid", sprite: "moss" },
      { x: 2200, y: 380, w: 160, h: 24, kind: "solid", sprite: "stone" },
      { x: 2480, y: GROUND, w: 440, h: 80, kind: "solid", sprite: "moss" },
    ],
    hazards: [turret(692, 390, "right", 1.8, 0.6), turret(2328, 380, "left", 1.8, 0.3), onGround(1680, 120)],
    coins: [
      { x: 740, y: 348, r: 11 },
      { x: 1100, y: 348, r: 11 },
      { x: 1480, y: 404, r: 11 },
      { x: 1860, y: 404, r: 11 },
      { x: 2260, y: 338, r: 11 },
      { x: 2680, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1460, GROUND)],
    flag: { x: 2760, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 4,
    name: "Flicker Bridge",
    blurb: "Stone that forgets it is stone. Step while it remembers.",
    theme: "indigo",
    width: 3080,
    height: 540,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 380, h: 80, kind: "solid", sprite: "moss" },
      timed(460, 420, 140, 2.4, 0.64, 0),
      timed(700, 390, 140, 2.4, 0.64, 0.8),
      timed(940, 360, 140, 2.4, 0.64, 1.6),
      { x: 1180, y: 390, w: 220, h: 24, kind: "solid", sprite: "stone" },
      timed(1500, 350, 130, 2.2, 0.6, 0.2),
      timed(1740, 330, 130, 2.2, 0.6, 1.1),
      timed(1980, 350, 130, 2.2, 0.6, 0.2),
      { x: 2220, y: 390, w: 180, h: 24, kind: "solid", sprite: "stone" },
      { x: 2520, y: GROUND, w: 560, h: 80, kind: "solid", sprite: "moss" },
    ],
    hazards: [turret(2260, 390, "right", 2.0, 0.8)],
    coins: [
      { x: 520, y: 378, r: 11 },
      { x: 760, y: 348, r: 11 },
      { x: 1000, y: 318, r: 11 },
      { x: 1280, y: 348, r: 11 },
      { x: 1560, y: 308, r: 11 },
      { x: 1800, y: 288, r: 11 },
      { x: 2300, y: 348, r: 11 },
      { x: 2760, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1268, 390)],
    flag: { x: 2880, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 5,
    name: "Crossfire",
    blurb: "Two mouths argue. The gap between their words is your path.",
    theme: "ember",
    width: 3340,
    height: 540,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 440, h: 80, kind: "solid", sprite: "moss" },
      { x: 540, y: 380, w: 150, h: 24, kind: "solid", sprite: "stone" },
      { x: 860, y: GROUND, w: 820, h: 80, kind: "solid", sprite: "moss" },
      { x: 1760, y: 300, w: 150, h: 24, kind: "solid", sprite: "stone" },
      timed(2020, 360, 140, 2.1, 0.6, 0),
      { x: 2280, y: GROUND, w: 1060, h: 80, kind: "solid", sprite: "moss" },
    ],
    hazards: [
      turret(548, 380, "right", 1.7, 0.5),
      turret(880, GROUND, "right", 1.85, 0.2),
      turret(1620, GROUND, "left", 1.85, 1.1),
      onGround(1188, 140),
      turret(2480, GROUND, "left", 1.9, 0.6),
    ],
    coins: [
      { x: 600, y: 338, r: 11 },
      { x: 980, y: 404, r: 11 },
      { x: 1388, y: 404, r: 11 },
      { x: 1820, y: 258, r: 11 },
      { x: 2080, y: 318, r: 11 },
      { x: 2700, y: 404, r: 11 },
      { x: 3040, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1480, GROUND)],
    flag: { x: 3160, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 6,
    name: "Vanishing Stair",
    blurb: "Climb what is not always there.",
    theme: "indigo",
    width: 3180,
    height: 560,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 360, h: 80, kind: "solid", sprite: "moss" },
      timed(420, 420, 120, 2.5, 0.66, 0),
      timed(580, 370, 120, 2.5, 0.66, 0.5),
      timed(740, 320, 120, 2.5, 0.66, 1.0),
      timed(900, 270, 120, 2.5, 0.66, 1.5),
      { x: 1100, y: 250, w: 200, h: 24, kind: "solid", sprite: "stone" },
      timed(1400, 300, 130, 2.2, 0.6, 0.3),
      timed(1640, 340, 130, 2.2, 0.6, 1.2),
      timed(1880, 300, 130, 2.2, 0.6, 0.3),
      { x: 2140, y: 360, w: 180, h: 24, kind: "solid", sprite: "stone" },
      { x: 2440, y: GROUND, w: 740, h: 80, kind: "solid", sprite: "moss" },
    ],
    hazards: [turret(2180, 360, "right", 1.9, 0.7)],
    coins: [
      { x: 470, y: 378, r: 11 },
      { x: 630, y: 328, r: 11 },
      { x: 790, y: 278, r: 11 },
      { x: 950, y: 228, r: 11 },
      { x: 1200, y: 208, r: 11 },
      { x: 1460, y: 258, r: 11 },
      { x: 1700, y: 298, r: 11 },
      { x: 2220, y: 318, r: 11 },
      { x: 2760, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1180, 250)],
    flag: { x: 2980, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 7,
    name: "Quarry Run",
    blurb: "Rafts, vanishing stone, and a pair of watchers.",
    theme: "ash",
    width: 3680,
    height: 560,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 420, h: 80, kind: "solid", sprite: "moss" },
      { x: 520, y: 390, w: 140, h: 24, kind: "solid", sprite: "stone" },
      {
        x: 780,
        y: 340,
        w: 150,
        h: 22,
        kind: "moving",
        sprite: "raft",
        move: { axis: "x", a: 700, b: 980, speed: 0.7, phase: 0 },
      },
      timed(1100, 300, 140, 2.3, 0.6, 0),
      { x: 1360, y: 280, w: 180, h: 24, kind: "solid", sprite: "stone" },
      timed(1640, 330, 130, 2.1, 0.58, 0.6),
      {
        x: 1900,
        y: 360,
        w: 150,
        h: 22,
        kind: "moving",
        sprite: "raft",
        move: { axis: "y", a: 250, b: 400, speed: 0.65, phase: 0.4 },
      },
      { x: 2180, y: GROUND, w: 520, h: 80, kind: "solid", sprite: "moss" },
      timed(2800, 380, 140, 2.2, 0.6, 0.2),
      { x: 3060, y: 340, w: 160, h: 24, kind: "solid", sprite: "stone" },
      { x: 3340, y: GROUND, w: 340, h: 80, kind: "solid", sprite: "moss" },
    ],
    hazards: [turret(1380, 280, "right", 1.8, 0.5), turret(3100, 340, "left", 1.85, 0.4), onGround(2360, 120)],
    coins: [
      { x: 560, y: 348, r: 11 },
      { x: 820, y: 298, r: 11 },
      { x: 1160, y: 258, r: 11 },
      { x: 1440, y: 238, r: 11 },
      { x: 1700, y: 288, r: 11 },
      { x: 1940, y: 220, r: 11 },
      { x: 2260, y: 404, r: 11 },
      { x: 2860, y: 338, r: 11 },
      { x: 3140, y: 298, r: 11 },
      { x: 3480, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1428, 280), lantern(2280, GROUND)],
    flag: { x: 3520, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 8,
    name: "Needle Gallery",
    blurb: "The ceiling has opinions. Keep moving.",
    theme: "ember",
    width: 3760,
    height: 560,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 400, h: 80, kind: "solid", sprite: "moss" },
      { x: 500, y: 390, w: 160, h: 24, kind: "solid", sprite: "stone" },
      { x: 520, y: 210, w: 120, h: 22, kind: "solid", sprite: "stone" },
      timed(780, 390, 150, 2.4, 0.64, 0),
      { x: 820, y: 190, w: 120, h: 22, kind: "solid", sprite: "stone" },
      timed(1060, 390, 150, 2.4, 0.64, 1.2),
      { x: 1100, y: 190, w: 120, h: 22, kind: "solid", sprite: "stone" },
      { x: 1360, y: GROUND, w: 360, h: 80, kind: "solid", sprite: "moss" },
      timed(1820, 360, 140, 2.2, 0.6, 0.4),
      { x: 1860, y: 180, w: 120, h: 22, kind: "solid", sprite: "stone" },
      { x: 2100, y: 340, w: 160, h: 24, kind: "solid", sprite: "stone" },
      timed(2380, 360, 140, 2.2, 0.6, 1.0),
      { x: 2640, y: GROUND, w: 1120, h: 80, kind: "solid", sprite: "moss" },
    ],
    hazards: [
      turret(548, 210, "down", 1.9, 0.3),
      turret(848, 190, "down", 1.9, 1.2),
      turret(1128, 190, "down", 1.9, 0.6),
      turret(1888, 180, "down", 1.85, 0.5),
      onGround(2800, 130),
    ],
    coins: [
      { x: 560, y: 348, r: 11 },
      { x: 840, y: 348, r: 11 },
      { x: 1120, y: 348, r: 11 },
      { x: 1500, y: 404, r: 11 },
      { x: 1880, y: 318, r: 11 },
      { x: 2160, y: 298, r: 11 },
      { x: 2440, y: 318, r: 11 },
      { x: 3000, y: 404, r: 11 },
      { x: 3360, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1500, GROUND), lantern(2720, GROUND)],
    flag: { x: 3560, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 9,
    name: "Hollow Crown",
    blurb: "Everything the woods learned, at once.",
    theme: "ash",
    width: 4040,
    height: 580,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 380, h: 80, kind: "solid", sprite: "moss" },
      { x: 460, y: 390, w: 140, h: 24, kind: "solid", sprite: "stone" },
      timed(700, 350, 130, 2.3, 0.62, 0),
      {
        x: 960,
        y: 300,
        w: 150,
        h: 22,
        kind: "moving",
        sprite: "raft",
        move: { axis: "y", a: 220, b: 380, speed: 0.7, phase: 0 },
      },
      { x: 1220, y: 260, w: 180, h: 24, kind: "solid", sprite: "stone" },
      timed(1500, 310, 130, 2.2, 0.6, 0.8),
      { x: 1760, y: GROUND, w: 420, h: 80, kind: "solid", sprite: "moss" },
      { x: 1800, y: 200, w: 120, h: 22, kind: "solid", sprite: "stone" },
      timed(2280, 380, 140, 2.15, 0.58, 0.3),
      {
        x: 2540,
        y: 330,
        w: 150,
        h: 22,
        kind: "moving",
        sprite: "raft",
        move: { axis: "x", a: 2420, b: 2760, speed: 0.72, phase: 0.5 },
      },
      { x: 2900, y: 300, w: 160, h: 24, kind: "solid", sprite: "stone" },
      timed(3160, 350, 140, 2.2, 0.6, 1.0),
      { x: 3440, y: GROUND, w: 600, h: 80, kind: "solid", sprite: "moss" },
    ],
    hazards: [
      turret(480, 390, "right", 1.8, 0.5),
      turret(1240, 260, "right", 1.85, 0.4),
      turret(1820, 200, "down", 1.9, 0.6),
      onGround(1920, 120),
      turret(2940, 300, "left", 1.8, 0.7),
      onGround(3580, 100),
    ],
    coins: [
      { x: 500, y: 348, r: 11 },
      { x: 760, y: 308, r: 11 },
      { x: 1000, y: 200, r: 11 },
      { x: 1300, y: 218, r: 11 },
      { x: 1560, y: 268, r: 11 },
      { x: 1860, y: 404, r: 11 },
      { x: 2340, y: 338, r: 11 },
      { x: 2600, y: 280, r: 11 },
      { x: 2980, y: 258, r: 11 },
      { x: 3220, y: 308, r: 11 },
      { x: 3760, y: 404, r: 11 },
    ],
    checkpoints: [lantern(1288, 260), lantern(2000, GROUND)],
    flag: { x: 3860, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 10,
    name: "Reed Wake",
    blurb: "The woods thicken. Watch the bramble.",
    theme: "thorn",
    width: 3100,
    height: 540,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 720, h: 80, kind: "solid", sprite: "wood" },
      { x: 860, y: 390, w: 160, h: 24, kind: "solid", sprite: "wood" },
      { x: 1140, y: GROUND, w: 520, h: 80, kind: "solid", sprite: "wood" },
      { x: 1780, y: 350, w: 150, h: 24, kind: "solid", sprite: "wood" },
      { x: 2060, y: 300, w: 140, h: 24, kind: "oneway", sprite: "wood" },
      { x: 2360, y: GROUND, w: 360, h: 80, kind: "solid", sprite: "wood" },
      { x: 2820, y: 390, w: 160, h: 24, kind: "solid", sprite: "wood" },
    ],
    hazards: [brambleOn(1280, 140), brambleOn(2520, 80)],
    coins: [
      { x: 300, y: 404, r: 11 },
      { x: 920, y: 348, r: 11 },
      { x: 1500, y: 404, r: 11 },
      { x: 1840, y: 308, r: 11 },
      { x: 2120, y: 258, r: 11 },
      { x: 2440, y: 404, r: 11 },
      { x: 2660, y: 404, r: 11 },
    ],
    checkpoints: [censer(1600, GROUND)],
    flag: { x: 2900, y: 280, w: 40, h: 110 },
  },
  {
    id: 11,
    name: "Slip Root",
    blurb: "The bark is wet. You will slide.",
    theme: "thorn",
    width: 2800,
    height: 540,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 420, h: 80, kind: "solid", sprite: "wood" },
      { x: 520, y: 400, w: 280, h: 24, kind: "slick", sprite: "wood" },
      { x: 920, y: 340, w: 240, h: 24, kind: "slick", sprite: "wood" },
      { x: 1320, y: GROUND, w: 360, h: 80, kind: "solid", sprite: "wood" },
      { x: 1780, y: 360, w: 300, h: 24, kind: "slick", sprite: "wood" },
      { x: 2200, y: 300, w: 180, h: 24, kind: "slick", sprite: "wood" },
      { x: 2540, y: 360, w: 180, h: 24, kind: "solid", sprite: "wood" },
    ],
    hazards: [bramblePlat(640, 400, 70)],
    coins: [
      { x: 240, y: 404, r: 11 },
      { x: 720, y: 358, r: 11 },
      { x: 1040, y: 298, r: 11 },
      { x: 1480, y: 404, r: 11 },
      { x: 1920, y: 318, r: 11 },
      { x: 2280, y: 258, r: 11 },
      { x: 2320, y: 258, r: 11 },
    ],
    checkpoints: [censer(1460, GROUND)],
    flag: { x: 2640, y: 250, w: 40, h: 110 },
  },
  {
    id: 12,
    name: "Cap Leap",
    blurb: "The caps throw you. Let them.",
    theme: "thorn",
    width: 2720,
    height: 560,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 480, h: 80, kind: "solid", sprite: "wood" },
      { x: 560, y: 400, w: 100, h: 22, kind: "bounce", sprite: "wood" },
      { x: 850, y: 280, w: 100, h: 24, kind: "solid", sprite: "wood" },
      { x: 1120, y: 400, w: 100, h: 22, kind: "bounce", sprite: "wood" },
      { x: 1395, y: 255, w: 100, h: 24, kind: "solid", sprite: "wood" },
      { x: 1720, y: GROUND, w: 380, h: 80, kind: "solid", sprite: "wood" },
      { x: 2220, y: 380, w: 100, h: 22, kind: "bounce", sprite: "wood" },
      { x: 2500, y: 250, w: 110, h: 24, kind: "solid", sprite: "wood" },
    ],
    hazards: [bramblePlat(914, 280, 36), bramblePlat(1459, 255, 36), brambleOn(1880, 100)],
    coins: [
      { x: 280, y: 404, r: 11 },
      { x: 880, y: 238, r: 11 },
      { x: 1425, y: 213, r: 11 },
      { x: 1760, y: 404, r: 11 },
      { x: 2080, y: 404, r: 11 },
    ],
    checkpoints: [censer(2020, GROUND)],
    flag: { x: 2565, y: 140, w: 40, h: 110 },
  },
  {
    id: 13,
    name: "Sawfen",
    blurb: "The thicket bites. Watch the bramble.",
    theme: "thorn",
    width: 2640,
    height: 540,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 560, h: 80, kind: "solid", sprite: "wood" },
      { x: 680, y: 390, w: 180, h: 24, kind: "solid", sprite: "wood" },
      { x: 1000, y: GROUND, w: 640, h: 80, kind: "solid", sprite: "wood" },
      { x: 1760, y: 340, w: 160, h: 24, kind: "solid", sprite: "wood" },
      { x: 2060, y: 280, w: 140, h: 24, kind: "oneway", sprite: "wood" },
      { x: 2280, y: GROUND, w: 260, h: 80, kind: "solid", sprite: "wood" },
    ],
    hazards: [bramblePlat(790, 390, 56), brambleOn(1180, 140), brambleOn(2288, 64)],
    coins: [
      { x: 300, y: 404, r: 11 },
      { x: 720, y: 348, r: 11 },
      { x: 1280, y: 404, r: 11 },
      { x: 1820, y: 298, r: 11 },
      { x: 2120, y: 238, r: 11 },
      { x: 2180, y: 238, r: 11 },
    ],
    checkpoints: [censer(1520, GROUND)],
    flag: { x: 2460, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 14,
    name: "Thorn Ferry",
    blurb: "Ride the root. Mind the bramble.",
    theme: "thorn",
    width: 3360,
    height: 560,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 400, h: 80, kind: "solid", sprite: "wood" },
      {
        x: 560,
        y: 360,
        w: 150,
        h: 22,
        kind: "moving",
        sprite: "wood",
        move: { axis: "x", a: 480, b: 820, speed: 0.7, phase: 0 },
      },
      { x: 1000, y: 300, w: 160, h: 24, kind: "solid", sprite: "wood" },
      {
        x: 1320,
        y: 280,
        w: 148,
        h: 22,
        kind: "moving",
        sprite: "wood",
        move: { axis: "y", a: 210, b: 380, speed: 0.65, phase: 0.3 },
      },
      { x: 1680, y: GROUND, w: 420, h: 80, kind: "solid", sprite: "wood" },
      { x: 2220, y: 340, w: 100, h: 22, kind: "bounce", sprite: "wood" },
      { x: 2515, y: 240, w: 100, h: 24, kind: "solid", sprite: "wood" },
      {
        x: 2720,
        y: 260,
        w: 140,
        h: 22,
        kind: "moving",
        sprite: "wood",
        move: { axis: "x", a: 2660, b: 3060, speed: 0.7, phase: 0 },
      },
      { x: 3080, y: 280, w: 160, h: 24, kind: "solid", sprite: "wood" },
    ],
    hazards: [bramblePlat(1100, 300, 50), bramblePlat(2579, 240, 36), brambleOn(1780, 90)],
    coins: [
      { x: 260, y: 404, r: 11 },
      { x: 640, y: 318, r: 11 },
      { x: 1060, y: 258, r: 11 },
      { x: 1380, y: 180, r: 11 },
      { x: 1860, y: 404, r: 11 },
      { x: 2540, y: 198, r: 11 },
      { x: 2700, y: 220, r: 11 },
    ],
    checkpoints: [censer(1860, GROUND)],
    flag: { x: 3160, y: 170, w: 40, h: 110 },
  },
  {
    id: 15,
    name: "Cinder Sill",
    blurb: "The well is warmer. The iron remembers.",
    theme: "cinder",
    width: 2640,
    height: 540,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 640, h: 80, kind: "solid", sprite: "iron" },
      { x: 780, y: 390, w: 160, h: 24, kind: "solid", sprite: "iron" },
      { x: 1060, y: GROUND, w: 560, h: 80, kind: "solid", sprite: "iron" },
      { x: 1740, y: 340, w: 150, h: 24, kind: "solid", sprite: "iron" },
      { x: 2040, y: 280, w: 160, h: 24, kind: "oneway", sprite: "iron" },
      { x: 2280, y: GROUND, w: 280, h: 80, kind: "solid", sprite: "iron" },
    ],
    hazards: [onGround(1180, 120), onGround(2344, 180)],
    coins: [
      { x: 300, y: 404, r: 11 },
      { x: 840, y: 348, r: 11 },
      { x: 1500, y: 404, r: 11 },
      { x: 1800, y: 298, r: 11 },
      { x: 1820, y: 298, r: 11 },
      { x: 1880, y: 298, r: 11 },
    ],
    checkpoints: [brazier(1580, GROUND)],
    flag: { x: 2120, y: 170, w: 40, h: 110 },
  },
  {
    id: 16,
    name: "Mill Mouth",
    blurb: "Teeth on iron. Do not linger.",
    theme: "cinder",
    width: 2560,
    height: 540,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 480, h: 80, kind: "solid", sprite: "iron" },
      { x: 600, y: 380, w: 180, h: 24, kind: "solid", sprite: "iron" },
      { x: 920, y: GROUND, w: 700, h: 80, kind: "solid", sprite: "iron" },
      { x: 1740, y: 330, w: 160, h: 24, kind: "solid", sprite: "iron" },
      { x: 2040, y: 270, w: 140, h: 24, kind: "oneway", sprite: "iron" },
      { x: 2300, y: GROUND, w: 180, h: 80, kind: "solid", sprite: "iron" },
    ],
    hazards: [
      millSaw(730, 320, "x", 700, 760, 1.35, 0),
      millSaw(1100, GROUND - 40, "x", 980, 1500, 1.05, 0.5),
      millSaw(2240, 360, "x", 2200, 2280, 1.2, 0.2),
    ],
    coins: [
      { x: 280, y: 404, r: 11 },
      { x: 650, y: 338, r: 11 },
      { x: 1280, y: 404, r: 11 },
      { x: 1800, y: 288, r: 11 },
      { x: 2100, y: 228, r: 11 },
      { x: 2160, y: 228, r: 11 },
    ],
    checkpoints: [brazier(1560, GROUND)],
    flag: { x: 2400, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 17,
    name: "Drip Well",
    blurb: "The ceiling weeps fire.",
    theme: "cinder",
    width: 2560,
    height: 560,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 500, h: 80, kind: "solid", sprite: "iron" },
      { x: 620, y: 390, w: 160, h: 24, kind: "solid", sprite: "iron" },
      { x: 900, y: GROUND, w: 520, h: 80, kind: "solid", sprite: "iron" },
      { x: 1540, y: 340, w: 180, h: 24, kind: "solid", sprite: "iron" },
      { x: 1860, y: 280, w: 150, h: 24, kind: "oneway", sprite: "iron" },
      { x: 2160, y: GROUND, w: 260, h: 80, kind: "solid", sprite: "iron" },
    ],
    hazards: [
      dripSpout(280, 120, 1.6, 0.1),
      dripSpout(700, 160, 1.4, 0.5),
      dripSpout(1100, 120, 1.5, 0.2),
      turret(1580, 340, "right", 1.9, 0.4),
      dripSpout(2220, 140, 1.35, 0.3),
      dripSpout(2300, 140, 1.55, 0.95),
    ],
    coins: [
      { x: 240, y: 404, r: 11 },
      { x: 680, y: 348, r: 11 },
      { x: 1180, y: 404, r: 11 },
      { x: 1620, y: 298, r: 11 },
      { x: 1920, y: 238, r: 11 },
      { x: 2180, y: 404, r: 11 },
    ],
    checkpoints: [brazier(1280, GROUND)],
    flag: { x: 2340, y: GROUND - 110, w: 40, h: 110 },
  },
  {
    id: 18,
    name: "Iron Choir",
    blurb: "Slide the hymn. Step while the iron remembers.",
    theme: "cinder",
    width: 3180,
    height: 560,
    spawnX: 72,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 400, h: 80, kind: "solid", sprite: "iron" },
      { x: 500, y: 400, w: 260, h: 24, kind: "slick", sprite: "iron" },
      { ...timed(860, 360, 140), sprite: "iron" },
      { x: 1120, y: 300, w: 160, h: 24, kind: "slick", sprite: "iron" },
      { x: 1420, y: GROUND, w: 360, h: 80, kind: "solid", sprite: "iron" },
      { ...timed(1880, 350, 140), sprite: "iron" },
      { x: 2160, y: 300, w: 150, h: 24, kind: "slick", sprite: "iron" },
      { x: 2460, y: 240, w: 140, h: 24, kind: "solid", sprite: "iron" },
      { ...timed(2680, 280, 140), sprite: "iron" },
      { x: 2920, y: 300, w: 160, h: 24, kind: "solid", sprite: "iron" },
      { x: 2640, y: GROUND, w: 220, h: 80, kind: "solid", sprite: "iron" },
    ],
    hazards: [dripSpout(1180, 140, 1.5, 0.4), millSaw(2260, 250, "x", 2230, 2300, 1.25, 0), onGround(2696, 148)],
    coins: [
      { x: 240, y: 404, r: 11 },
      { x: 620, y: 358, r: 11 },
      { x: 920, y: 318, r: 11 },
      { x: 1180, y: 258, r: 11 },
      { x: 1580, y: 404, r: 11 },
      { x: 2220, y: 258, r: 11 },
      { x: 2520, y: 198, r: 11 },
      { x: 2740, y: 238, r: 11 },
    ],
    checkpoints: [brazier(1560, GROUND)],
    flag: { x: 3000, y: 190, w: 40, h: 110 },
  },
  {
    id: 19,
    name: "Deep Crown",
    blurb: "Everything the well learned, at once.",
    theme: "cinder",
    width: 3720,
    height: 580,
    spawnX: 80,
    spawnY: GROUND - PLAYER_H,
    platforms: [
      { x: 0, y: GROUND, w: 380, h: 80, kind: "solid", sprite: "iron" },
      { x: 460, y: 390, w: 140, h: 24, kind: "solid", sprite: "iron" },
      { x: 700, y: 400, w: 100, h: 22, kind: "bounce", sprite: "iron" },
      {
        x: 1020,
        y: 300,
        w: 150,
        h: 22,
        kind: "moving",
        sprite: "iron",
        move: { axis: "y", a: 220, b: 380, speed: 0.7, phase: 0 },
      },
      { x: 1220, y: 260, w: 180, h: 24, kind: "slick", sprite: "iron" },
      { ...timed(1500, 310, 130), sprite: "iron" },
      { x: 1760, y: GROUND, w: 420, h: 80, kind: "solid", sprite: "iron" },
      { x: 2280, y: 380, w: 140, h: 24, kind: "solid", sprite: "iron" },
      {
        x: 2540,
        y: 330,
        w: 150,
        h: 22,
        kind: "moving",
        sprite: "iron",
        move: { axis: "x", a: 2420, b: 2760, speed: 0.72, phase: 0.5 },
      },
      { x: 2900, y: 300, w: 160, h: 24, kind: "solid", sprite: "iron" },
      { x: 3160, y: 400, w: 100, h: 22, kind: "bounce", sprite: "iron" },
      { x: 3435, y: 250, w: 110, h: 24, kind: "solid", sprite: "iron" },
      { x: 3400, y: GROUND, w: 200, h: 80, kind: "solid", sprite: "iron" },
    ],
    hazards: [
      turret(480, 390, "right", 1.8, 0.5),
      millSaw(1340, 210, "x", 1310, 1380, 1.2, 0.3),
      dripSpout(1860, 140, 1.45, 0.2),
      turret(2940, 300, "left", 1.8, 0.7),
      onGround(3464, 120),
    ],
    coins: [
      { x: 500, y: 348, r: 11 },
      { x: 740, y: 358, r: 11 },
      { x: 1080, y: 200, r: 11 },
      { x: 1260, y: 218, r: 11 },
      { x: 1560, y: 268, r: 11 },
      { x: 1860, y: 404, r: 11 },
      { x: 2340, y: 338, r: 11 },
      { x: 2600, y: 280, r: 11 },
      { x: 2980, y: 258, r: 11 },
      { x: 3220, y: 358, r: 11 },
    ],
    checkpoints: [brazier(1288, 260), brazier(2000, GROUND)],
    flag: { x: 3495, y: 140, w: 40, h: 110 },
  },
];

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, pad = 0) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

function isSheltered(h: Hazard, platforms: Platform[]) {
  for (const p of platforms) {
    if (p.h >= 50) continue;
    if (p.y >= h.y - 4) continue;
    if (p.y < h.y - 140) continue;
    const overlap = Math.min(h.x + h.w, p.x + p.w) - Math.max(h.x, p.x);
    if (overlap > h.w * 0.65) return p;
  }
  return null;
}

function seatFor(x: number, feetY: number, platforms: Platform[]) {
  let best: Platform | null = null;
  let bestDist = 1e9;
  for (const p of platforms) {
    if (p.kind === "moving" || p.kind === "timed") continue;
    if (x < p.x - 4 || x > p.x + p.w + 4) continue;
    const d = Math.abs(feetY - p.y);
    if (d < bestDist && d < 28) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

function blockedAt(x: number, y: number, world: World) {
  return world.hazards.some((hz) => {
    const kind = hz.kind ?? "spike";
    if (kind !== "spike" && kind !== "saw") return false;
    return overlaps({ x, y, w: PLAYER_W, h: PLAYER_H }, hz, 10);
  });
}

export function spawnFromCheckpoint(cp: Checkpoint, world: World) {
  const lampX = cp.x + cp.w / 2;
  const lampFeet = cp.y + cp.h;
  let seat = seatFor(lampX, lampFeet, world.platforms);
  if (!seat) {
    for (const p of world.platforms) {
      if (p.kind === "moving" || p.kind === "timed") continue;
      const cx = Math.max(p.x, Math.min(p.x + p.w, lampX));
      const d = Math.abs(cx - lampX) + Math.abs(p.y - lampFeet);
      if (!seat || d < Math.abs(seat.x + seat.w / 2 - lampX) + Math.abs(seat.y - lampFeet)) seat = p;
    }
  }
  if (!seat) {
    return { x: world.spawnX, y: world.spawnY };
  }

  const margin = Math.min(20, Math.max(8, (seat.w - PLAYER_W) / 2));
  let x = lampX - PLAYER_W / 2;
  x = Math.max(seat.x + margin, Math.min(seat.x + seat.w - PLAYER_W - margin, x));
  const y = seat.y - PLAYER_H;

  if (!blockedAt(x, y, world)) return { x, y };

  for (const dx of [-48, 48, -88, 88, -130, 130, -seat.w / 2, seat.w / 2]) {
    const nx = Math.max(seat.x + margin, Math.min(seat.x + seat.w - PLAYER_W - margin, x + dx));
    if (!blockedAt(nx, y, world)) return { x: nx, y };
  }

  return { x: world.spawnX, y: world.spawnY };
}

function sanitizeWorld(world: World) {
  for (const h of world.hazards) {
    if (h.kind === "turret" || h.kind === "saw" || h.kind === "spout") continue;
    let seat: Platform | null = null;
    for (const p of world.platforms) {
      if (h.x + h.w < p.x + 10 || h.x > p.x + p.w - 10) continue;
      if (Math.abs(h.y + h.h - p.y) < 48) seat = p;
    }
    if (!seat) continue;
    h.y = seat.y - h.h;
    if (h.x < seat.x) h.x = seat.x + 8;
    if (h.x + h.w > seat.x + seat.w) h.w = Math.max(36, seat.x + seat.w - 8 - h.x);

    const roof = isSheltered(h, world.platforms);
    if (roof && seat) {
      const left = roof.x - h.w - 24;
      const right = roof.x + roof.w + 24;
      if (left >= seat.x + 8) h.x = left;
      else if (right + h.w <= seat.x + seat.w - 8) h.x = right;
    }
  }

  for (const cp of world.checkpoints) {
    const spawn = spawnFromCheckpoint({ ...cp, active: false }, world);
    const seat = seatFor(spawn.x + PLAYER_W / 2, spawn.y + PLAYER_H, world.platforms);
    if (!seat) continue;
    const margin = 12;
    cp.x = Math.max(seat.x + margin, Math.min(seat.x + seat.w - cp.w - margin, cp.x));
    cp.y = seat.y - cp.h;
    const stillBad = world.hazards.some((h) => overlaps(cp, h, 20));
    if (stillBad) {
      cp.x = Math.max(seat.x + margin, Math.min(seat.x + seat.w - cp.w - margin, spawn.x));
      cp.y = seat.y - cp.h;
    }
  }

  for (const c of world.coins) {
    const grab = { x: c.x - 24, y: c.y - 24, w: 48, h: 52 };
    const hot = world.hazards.find((h) => {
      const kind = h.kind ?? "spike";
      return (kind === "spike" || kind === "saw") && overlaps(grab, h, 16);
    });
    if (!hot) continue;
    const left = hot.x - 56;
    const right = hot.x + hot.w + 56;
    for (const nx of [left, right, left - 50, right + 50]) {
      if (nx < 40 || nx > world.width - 40) continue;
      const next = { x: nx - 24, y: c.y - 24, w: 48, h: 52 };
      if (world.hazards.some((h) => overlaps(next, h, 16))) continue;
      c.x = nx;
      break;
    }
  }

  const flag = world.flag;
  const keepOut = { x: flag.x - 120, y: flag.y - 24, w: flag.w + 200, h: flag.h + 48 };
  for (const c of world.coins) {
    const grab = { x: c.x - 14, y: c.y - 14, w: 28, h: 28 };
    if (!overlaps(grab, keepOut, 0)) continue;
    for (const nx of [flag.x - 150, flag.x - 210, flag.x - 270]) {
      if (nx < 40) continue;
      const next = { x: nx - 14, y: c.y - 14, w: 28, h: 28 };
      if (overlaps(next, keepOut, 0)) continue;
      if (world.hazards.some((h) => overlaps(next, h, 12))) continue;
      c.x = nx;
      break;
    }
  }
}

export const ACTS = [
  { id: 1, name: "Musty Forest", start: 0, count: 10 },
  { id: 2, name: "Bramble Ruins", start: 10, count: 10 },
] as const;

export function actForLevel(levelId: number) {
  return ACTS.find((a) => levelId >= a.start && levelId < a.start + a.count) ?? ACTS[0];
}

export function levelsInAct(actId: number) {
  const act = ACTS.find((a) => a.id === actId) ?? ACTS[0];
  return LEVELS.filter((lvl) => lvl.id >= act.start && lvl.id < act.start + act.count);
}

export function bootLevel(id: number): World {
  const def = LEVELS[id] ?? LEVELS[0];
  const world: World = {
    id: def.id,
    name: def.name,
    theme: def.theme ?? "moss",
    width: def.width,
    height: def.height,
    spawnX: def.spawnX,
    spawnY: def.spawnY,
    platforms: def.platforms.map((p) => {
      const blocks = Math.max(3, Math.round(p.w / 26));
      return {
        ...p,
        prevX: p.x,
        prevY: p.y,
        move: p.move ? { ...p.move } : undefined,
        crumble:
          p.kind === "timed"
            ? { delay: 0.5, blockTime: 0.13, rebuild: 2.5, blocks, gone: 0, wait: 0, phase: "idle" as const }
            : undefined,
      };
    }),
    hazards: def.hazards.map((h) => ({ ...h, kind: h.kind ?? "spike", cool: h.cool ?? h.interval ?? 0 })),
    bolts: [],
    drips: [],
    coins: def.coins.map((c, i) => ({ ...c, taken: false, bob: i * 0.7 })),
    checkpoints: def.checkpoints.map((c) => ({ ...c, active: false })),
    flag: { ...def.flag },
  };
  sanitizeWorld(world);
  return world;
}
