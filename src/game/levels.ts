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
  return { x, y: surfaceY - 54, w: 20, h: 54 };
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
  return world.hazards.some((hz) => (hz.kind ?? "spike") === "spike" && overlaps({ x, y, w: PLAYER_W, h: PLAYER_H }, hz, 10));
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
    if (h.kind === "turret") continue;
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
    const hot = world.hazards.find((h) => (h.kind ?? "spike") === "spike" && overlaps(grab, h, 16));
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
    coins: def.coins.map((c, i) => ({ ...c, taken: false, bob: i * 0.7 })),
    checkpoints: def.checkpoints.map((c) => ({ ...c, active: false })),
    flag: { ...def.flag },
  };
  sanitizeWorld(world);
  return world;
}
