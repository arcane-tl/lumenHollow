import {
  ACCEL_AIR,
  ACCEL_GROUND,
  APEX_BAND,
  BOUNCE_SQUASH,
  BOUNCE_VEL,
  COYOTE,
  DOUBLE_JUMP_VEL,
  FRICTION,
  GRAVITY_APEX,
  GRAVITY_DOWN,
  GRAVITY_UP,
  JUMP_BUFFER,
  JUMP_CUT,
  JUMP_GRACE,
  JUMP_LOCK,
  JUMP_VEL,
  MAX_FALL,
  PLAYER_H,
  PLAYER_W,
  RUN_MAX,
  SLICK_ACCEL,
  SLICK_FRICTION,
  STEP,
  VIEW_H,
  VIEW_W,
} from "./constants";
import { bootLevel, spawnFromCheckpoint } from "./levels";
import type { Actions, DeathReason, Hazard, Particle, Platform, Player, World } from "./types";

export interface Sim {
  world: World;
  player: Player;
  camera: { x: number; y: number; shake: number; look: number };
  particles: Particle[];
  coins: number;
  totalCoins: number;
  deaths: number;
  deathReason: DeathReason;
  won: boolean;
  flagRaise: number;
  time: number;
  justDied: boolean;
  viewW: number;
  viewH: number;
}

export interface StepEvents {
  jumped: boolean;
  doubleJumped: boolean;
  landed: boolean;
  coined: boolean;
  checkpoint: boolean;
  died: boolean;
  won: boolean;
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circleHitsRect(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number) {
  const nx = Math.max(x, Math.min(cx, x + w));
  const ny = Math.max(y, Math.min(cy, y + h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function columnHit(px: number, pw: number, ox: number, ow: number, pad = 16) {
  return px < ox + ow + pad && px + pw > ox - pad;
}

function spawnPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    coyote: COYOTE,
    jumpBuffer: 0,
    jumpsLeft: 2,
    jumpCut: false,
    jumpGrace: 0,
    jumpLock: 0,
    dropThrough: 0,
    ride: null,
    anim: "idle",
    animTime: 0,
    invuln: 0,
    deadTimer: 0,
    airTime: 0,
    spawnX: x,
    spawnY: y,
  };
}

export function createSim(levelId: number): Sim {
  const world = bootLevel(levelId);
  return {
    world,
    player: spawnPlayer(world.spawnX, world.spawnY),
    camera: { x: Math.max(0, world.spawnX - 200), y: 0, shake: 0, look: 0 },
    particles: [],
    coins: 0,
    totalCoins: world.coins.length,
    deaths: 0,
    deathReason: null,
    won: false,
    flagRaise: 0,
    time: 0,
    justDied: false,
    viewW: VIEW_W,
    viewH: VIEW_H,
  };
}

export function resetSim(sim: Sim, levelId: number) {
  Object.assign(sim, createSim(levelId));
}

export function tickWinFx(sim: Sim, dt: number) {
  sim.flagRaise = Math.min(1, sim.flagRaise + dt / 0.7);
  let live = 0;
  for (const part of sim.particles) {
    part.life -= dt;
    if (part.life <= 0) continue;
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.vy += (part.kind === "confetti" ? 220 : 420) * dt;
    sim.particles[live] = part;
    live += 1;
  }
  sim.particles.length = live;
}

export function respawnAtCheckpoint(sim: Sim) {
  const p = sim.player;
  const lit = [...sim.world.checkpoints].reverse().find((c) => c.active);
  const spawn = lit
    ? spawnFromCheckpoint(lit, sim.world)
    : { x: sim.world.spawnX, y: sim.world.spawnY };
  p.spawnX = spawn.x;
  p.spawnY = spawn.y;
  p.x = spawn.x;
  p.y = spawn.y;
  p.vx = 0;
  p.vy = 0;
  p.grounded = true;
  p.coyote = COYOTE;
  p.jumpsLeft = 2;
  p.jumpCut = false;
  p.jumpGrace = 0;
  p.jumpLock = 0;
  p.jumpBuffer = 0;
  p.dropThrough = 0;
  p.deadTimer = 0;
  p.airTime = 0;
  p.invuln = 0.8;
  p.ride = null;
  sim.justDied = false;
  sim.particles = [];
  sim.world.bolts = [];
  sim.world.drips = [];
  sim.camera.shake = 0;
  sim.camera.look = 0;
  const vw = sim.viewW || VIEW_W;
  const maxX = Math.max(0, sim.world.width - vw);
  sim.camera.x = Math.max(0, Math.min(maxX, p.x + p.w / 2 - vw / 2));
  resetCrumbles(sim.world);
}

const EVENTS: StepEvents = {
  jumped: false,
  doubleJumped: false,
  landed: false,
  coined: false,
  checkpoint: false,
  died: false,
  won: false,
};

const BODY: Platform = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  kind: "solid",
  sprite: "moss",
  prevX: 0,
  prevY: 0,
};

function platBody(plat: Platform) {
  if (plat.kind !== "timed" || !plat.crumble) return plat;
  const c = plat.crumble;
  BODY.x = plat.x;
  BODY.y = plat.y;
  BODY.h = plat.h;
  BODY.kind = plat.kind;
  BODY.sprite = plat.sprite;
  if (c.gone >= c.blocks) {
    BODY.w = 0;
    return BODY;
  }
  const bw = plat.w / c.blocks;
  BODY.x = plat.x + c.gone * bw;
  BODY.w = plat.w - c.gone * bw;
  return BODY;
}

function platformActive(plat: Platform, _t?: number) {
  if (plat.kind !== "timed" || !plat.crumble) return true;
  return plat.crumble.gone < plat.crumble.blocks;
}

function resetCrumbles(world: World) {
  for (const p of world.platforms) {
    if (!p.crumble) continue;
    p.crumble.gone = 0;
    p.crumble.wait = 0;
    p.crumble.phase = "idle";
  }
}

function stepCrumble(sim: Sim, dt: number) {
  const p = sim.player;
  for (const plat of sim.world.platforms) {
    const c = plat.crumble;
    if (plat.kind !== "timed" || !c) continue;
    if (c.phase === "idle") {
      const body = platBody(plat);
      const onTop =
        p.grounded &&
        body.w > 3 &&
        p.y + p.h <= body.y + 6 &&
        p.y + p.h >= body.y - 8 &&
        p.x + p.w > body.x + 2 &&
        p.x < body.x + body.w - 2;
      if (onTop || p.ride === plat) {
        c.phase = "hold";
        c.wait = c.delay;
      }
      continue;
    }
    if (c.phase === "hold") {
      c.wait -= dt;
      if (c.wait <= 0) {
        c.phase = "fall";
        c.wait = 0;
      }
      continue;
    }
    if (c.phase === "fall") {
      c.wait -= dt;
      while (c.wait <= 0 && c.gone < c.blocks) {
        const bw = plat.w / c.blocks;
        const fx = plat.x + c.gone * bw + bw * 0.5;
        emit(sim, "dust", fx, plat.y + plat.h * 0.4, 5, "#7a6a4a");
        c.gone += 1;
        c.wait += c.blockTime;
      }
      if (c.gone >= c.blocks) {
        c.phase = "gone";
        c.wait = c.rebuild;
      }
      continue;
    }
    c.wait -= dt;
    if (c.wait <= 0) {
      c.phase = "idle";
      c.gone = 0;
      c.wait = 0;
    }
  }
}

function emit(sim: Sim, kind: Particle["kind"], x: number, y: number, n: number, color: string) {
  const cap = kind === "confetti" ? 96 : 28;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = kind === "dust" ? 40 + Math.random() * 50 : kind === "confetti" ? 60 + Math.random() * 180 : 80 + Math.random() * 140;
    const life = kind === "spark" ? 0.28 : kind === "confetti" ? 1.4 : 0.4;
    const next = {
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - (kind === "dust" ? 30 : kind === "confetti" ? 90 : 40),
      life,
      max: life,
      size: kind === "spark" ? 3 : kind === "confetti" ? 3 + Math.random() * 3 : 4,
      color,
      kind,
    };
    if (sim.particles.length < cap) sim.particles.push(next);
    else {
      let oldest = 0;
      for (let p = 1; p < sim.particles.length; p++) {
        if (sim.particles[p].life < sim.particles[oldest].life) oldest = p;
      }
      sim.particles[oldest] = next;
    }
  }
}

const CONFETTI = ["#e8c56b", "#ece8e1", "#c9a227", "#7d9a78", "#d4b8d8", "#c45c4a"];

export function burstConfetti(sim: Sim, x: number, y: number) {
  for (const color of CONFETTI) emit(sim, "confetti", x, y, 10, color);
}

function moveAlong(move: NonNullable<Platform["move"]>, t: number) {
  const mid = (move.a + move.b) / 2;
  const amp = (move.b - move.a) / 2;
  return mid + Math.sin(t * move.speed + move.phase) * amp;
}

function movePlatforms(world: World, t: number) {
  for (const p of world.platforms) {
    p.prevX = p.x;
    p.prevY = p.y;
    if (!p.move) continue;
    const v = moveAlong(p.move, t);
    if (p.move.axis === "x") p.x = v;
    else p.y = v;
  }
}

function stepSaws(world: World, t: number) {
  for (const h of world.hazards) {
    if (h.kind !== "saw" || !h.move) continue;
    h.prevX = h.x;
    h.prevY = h.y;
    const v = moveAlong(h.move, t);
    if (h.move.axis === "x") h.x = v;
    else h.y = v;
  }
}

function stepDrips(sim: Sim, dt: number) {
  const world = sim.world;
  if (!world.drips) world.drips = [];
  for (const h of world.hazards) {
    if (h.kind !== "spout") continue;
    h.cool = (h.cool ?? 0) - dt;
    if ((h.cool ?? 0) > 0) continue;
    h.cool = h.interval ?? 1.4;
    world.drips.push({
      x: h.x + h.w / 2 - 5,
      y: h.y + h.h - 2,
      w: 10,
      h: 12,
      vx: 0,
      vy: 80,
      life: 2.8,
    });
  }
  for (const d of world.drips) {
    d.vy = Math.min(MAX_FALL, d.vy + GRAVITY_DOWN * 0.55 * dt);
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.life -= dt;
  }
  world.drips = world.drips.filter((d) => {
    if (d.life <= 0) return false;
    if (d.y > world.height + 40) return false;
    for (const plat of world.platforms) {
      if (plat.kind === "oneway" || plat.kind === "bounce") continue;
      if (!platformActive(plat, sim.time)) continue;
      const body = platBody(plat);
      if (overlaps(d.x, d.y, d.w, d.h, body.x, body.y, body.w, body.h)) return false;
    }
    return true;
  });
}

function turretMount(world: World, h: Hazard): Platform | null {
  const feet = h.y + h.h;
  const mid = h.x + h.w / 2;
  let best: Platform | null = null;
  let bestD = 20;
  for (const p of world.platforms) {
    if (mid < p.x - 6 || mid > p.x + p.w + 6) continue;
    const d = Math.abs(feet - p.y);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

function stepTurrets(sim: Sim, dt: number) {
  const world = sim.world;
  if (!world.bolts) world.bolts = [];
  for (const h of world.hazards) {
    if (h.kind !== "turret" || !h.dir) continue;
    h.cool = (h.cool ?? 0) - dt;
    if (h.cool > 0) continue;
    h.cool += h.interval ?? 1.7;
    const speed = 290;
    const horizontal = Math.abs(h.dir.x) >= Math.abs(h.dir.y);
    const bw = horizontal ? 22 : 8;
    const bh = horizontal ? 8 : 22;
    const mount = turretMount(world, h);
    let cx = h.x + h.w / 2 + h.dir.x * (h.w * 0.62);
    let cy = h.y + h.h / 2 + h.dir.y * (h.h * 0.62);
    if (h.dir.y > 0 && mount) cy = mount.y + mount.h + bh / 2 + 6;
    if (h.dir.y < 0) cy = h.y - bh / 2 - 4;
    world.bolts.push({
      x: cx - bw / 2,
      y: cy - bh / 2,
      w: bw,
      h: bh,
      vx: h.dir.x * speed,
      vy: h.dir.y * speed,
      life: 3.4,
      skipX: mount?.x,
      skipY: mount?.y,
      skipW: mount?.w,
      skipH: mount?.h,
    });
  }

  for (const b of world.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }

  world.bolts = world.bolts.filter((b) => {
    if (b.life <= 0) return false;
    if (b.x < -60 || b.y < -60 || b.x > world.width + 60 || b.y > world.height + 60) return false;
    for (const plat of world.platforms) {
      if (plat.kind === "oneway") continue;
      if (!platformActive(plat, sim.time)) continue;
      if (
        b.skipW &&
        plat.x === b.skipX &&
        plat.y === b.skipY &&
        plat.w === b.skipW
      ) {
        continue;
      }
      const body = platBody(plat);
      if (overlaps(b.x, b.y, b.w, b.h, body.x, body.y, body.w, body.h)) return false;
    }
    return true;
  });
}

function resolveTurretY(p: Player, hazards: Hazard[]) {
  let grounded = false;
  for (const h of hazards) {
    if (h.kind !== "turret") continue;
    if ((h.dir?.y ?? 0) > 0) continue;
    if (!overlaps(p.x, p.y, p.w, p.h, h.x, h.y, h.w, h.h)) continue;
    if (p.vy < 0) continue;
    const prevBottom = p.y + p.h - p.vy * STEP;
    if (prevBottom > h.y + 6) continue;
    p.y = h.y - p.h;
    p.vy = 0;
    grounded = true;
  }
  return grounded;
}

function overX(p: Player, body: { x: number; w: number }, pad = 0) {
  return p.x + p.w > body.x + pad && p.x < body.x + body.w - pad;
}

function landingFromAbove(p: Player, plat: Platform, body: Platform, prevBottom: number) {
  if (p.vy < 0) return false;
  const top = body.y;
  const prevTop = plat.prevY;
  const feet = p.y + p.h;
  const surface = Math.min(prevTop, top);
  return prevBottom <= surface + 10 && feet >= surface - 6;
}

function resolveX(p: Player, plats: Platform[], prevBottom: number) {
  for (const plat of plats) {
    if (plat.kind === "oneway" || plat.kind === "bounce") continue;
    const body = platBody(plat);
    if (body.w <= 3) continue;
    if (!overlaps(p.x, p.y, p.w, p.h, body.x, body.y, body.w, body.h)) continue;
    const feet = p.y + p.h;
    const onTop = p.ride === plat || (feet <= body.y + 8 && feet >= body.y - 6);
    if (onTop || (body.h < 40 && landingFromAbove(p, plat, body, prevBottom))) continue;
    if (p.vx > 0) p.x = body.x - p.w;
    else if (p.vx < 0) p.x = body.x + body.w;
    p.vx = 0;
  }
}

function resolveY(p: Player, plats: Platform[], downHeld: boolean, dt: number, prevBottom: number) {
  let grounded = false;
  let ride: Platform | null = null;
  const wasRide = p.ride;
  for (const plat of plats) {
    const body = platBody(plat);
    if (body.w <= 3) continue;
    const rideHold = wasRide === plat;
    if (!overX(p, body, rideHold ? -3 : 0)) continue;

    const top = body.y;
    const prevTop = plat.prevY;
    const hit = overlaps(p.x, p.y, p.w, p.h, body.x, body.y, body.w, body.h);
    const feet = p.y + p.h;
    const crossed = p.vy >= 0 && prevBottom <= Math.max(prevTop, top) + 8 && feet >= Math.min(prevTop, top) - 6;
    const jumping = p.vy < -120;
    const staying = rideHold && !jumping && overX(p, body, -4);

    if (plat.kind === "oneway") {
      if (p.dropThrough > 0) continue;
      if (downHeld && p.grounded) {
        p.dropThrough = 0.18;
        continue;
      }
      if (p.vy < 0) continue;
      if (!staying && !crossed && prevBottom > prevTop + 8) continue;
    }

    if (p.vy >= 0 && (staying || crossed || (hit && feet - top < body.h * 0.65 + 10))) {
      if (plat.kind === "bounce") {
        p.y = top - p.h;
        p.vy = BOUNCE_VEL;
        p.jumpCut = true;
        p.jumpGrace = JUMP_GRACE;
        p.grounded = false;
        p.coyote = 0;
        p.jumpsLeft = 1;
        p.ride = null;
        plat.squash = BOUNCE_SQUASH;
        continue;
      }
      p.y = top - p.h + 0.15;
      p.vy = 0;
      grounded = true;
      ride = plat;
    } else if (plat.kind !== "oneway" && plat.kind !== "bounce" && p.vy < 0 && hit) {
      p.y = body.y + body.h;
      p.vy = 0;
    }
  }
  p.grounded = grounded;
  p.ride = ride;
}

export function stepSim(sim: Sim, actions: Actions, dt: number): StepEvents {
  EVENTS.jumped = false;
  EVENTS.doubleJumped = false;
  EVENTS.landed = false;
  EVENTS.coined = false;
  EVENTS.checkpoint = false;
  EVENTS.died = false;
  EVENTS.won = false;
  const events = EVENTS;
  const p = sim.player;
  sim.time += dt;
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
  if (p.jumpLock > 0) p.jumpLock = Math.max(0, p.jumpLock - dt);
  if (p.jumpGrace > 0) p.jumpGrace = Math.max(0, p.jumpGrace - dt);
  if (p.dropThrough > 0) p.dropThrough = Math.max(0, p.dropThrough - dt);

  if (p.deadTimer > 0) {
    p.deadTimer = Math.max(0, p.deadTimer - dt);
    return events;
  }

  if (sim.won) {
    p.vx = 0;
    p.vy = 0;
  }

  movePlatforms(sim.world, sim.time);
  for (const plat of sim.world.platforms) {
    if (plat.squash && plat.squash > 0) plat.squash = Math.max(0, plat.squash - dt);
  }
  stepSaws(sim.world, sim.time);
  stepTurrets(sim, dt);
  stepDrips(sim, dt);

  if (p.ride && !platformActive(p.ride, sim.time)) p.ride = null;

  if (p.ride) {
    p.x += p.ride.x - p.ride.prevX;
    p.y += p.ride.y - p.ride.prevY;
  }

  const slick = p.grounded && p.ride?.kind === "slick";
  const accel = p.grounded ? (slick ? SLICK_ACCEL : ACCEL_GROUND) : ACCEL_AIR;
  if (!sim.won && actions.moveX !== 0) {
    p.vx += actions.moveX * accel * dt;
    p.facing = actions.moveX > 0 ? 1 : -1;
  } else if (p.grounded) {
    const fr = (slick ? SLICK_FRICTION : FRICTION) * dt;
    if (Math.abs(p.vx) <= fr) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * fr;
  }
  if (p.vx > RUN_MAX) p.vx = RUN_MAX;
  if (p.vx < -RUN_MAX) p.vx = -RUN_MAX;

  const wasGrounded = p.grounded;
  if (p.grounded) {
    p.coyote = COYOTE;
    p.jumpsLeft = 2;
  } else {
    p.coyote = Math.max(0, p.coyote - dt);
  }

  if (actions.jumpPressed) p.jumpBuffer = JUMP_BUFFER;
  else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

  const wantJump = p.jumpBuffer > 0 && p.jumpLock <= 0;
  const canGroundJump = (p.grounded || p.coyote > 0) && p.jumpsLeft > 0;
  const canAirJump = !p.grounded && p.coyote <= 0 && p.jumpsLeft > 0;

  if (!sim.won && wantJump && (canGroundJump || canAirJump)) {
    const fromGround = canGroundJump;
    p.vy = fromGround ? JUMP_VEL : DOUBLE_JUMP_VEL;
    p.grounded = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    p.jumpCut = false;
    p.jumpGrace = JUMP_GRACE;
    p.jumpLock = JUMP_LOCK;
    p.jumpsLeft -= 1;
    p.ride = null;
    if (fromGround) {
      events.jumped = true;
      emit(sim, "dust", p.x + p.w / 2, p.y + p.h, 3, "#c8c2b0");
    } else {
      events.doubleJumped = true;
      emit(sim, "spark", p.x + p.w / 2, p.y + p.h, 4, "#d8d4cc");
    }
  }

  if (!actions.jumpHeld && p.vy < 0 && p.jumpGrace <= 0 && !p.jumpCut) {
    p.vy *= JUMP_CUT;
    p.jumpCut = true;
  }

  let g = GRAVITY_DOWN;
  if (p.vy < 0) g = GRAVITY_UP;
  if (Math.abs(p.vy) < APEX_BAND) g = GRAVITY_APEX;
  p.vy += g * dt;
  if (p.vy > MAX_FALL) p.vy = MAX_FALL;

  p.x += p.vx * dt;
  const prevBottom = p.y + p.h;
  resolveX(p, sim.world.platforms, prevBottom);
  p.y += p.vy * dt;
  resolveY(p, sim.world.platforms, actions.downHeld, dt, prevBottom);
  if (resolveTurretY(p, sim.world.hazards)) p.grounded = true;
  stepCrumble(sim, dt);

  const air = p.airTime;
  if (p.grounded) p.airTime = 0;
  else p.airTime += dt;

  if (p.grounded && !wasGrounded && p.vy >= 0 && air > 0.1) {
    events.landed = true;
    emit(sim, "dust", p.x + p.w / 2, p.y + p.h, 3, "#b8b09c");
  }

  if (p.x < 0) {
    p.x = 0;
    p.vx = 0;
  }
  if (p.x + p.w > sim.world.width) {
    p.x = sim.world.width - p.w;
    p.vx = 0;
  }

  if (p.y > sim.world.height + 48) {
    p.deadTimer = 0.45;
    sim.deaths += 1;
    sim.deathReason = "pit";
    sim.camera.shake = 2;
    events.died = true;
    return events;
  }

  if (p.invuln <= 0) {
    for (const h of sim.world.hazards) {
      const kind = h.kind ?? "spike";
      if (kind !== "spike" && kind !== "saw") continue;
      const hit =
        kind === "saw"
          ? circleHitsRect(
              h.x + h.w / 2,
              h.y + h.h / 2,
              Math.max(h.w, h.h) / 2 + 2,
              p.x + 2,
              p.y,
              p.w - 4,
              p.h,
            )
          : overlaps(p.x + 4, p.y + 8, p.w - 8, p.h - 8, h.x, h.y, h.w, h.h);
      if (hit) {
        p.deadTimer = 0.45;
        sim.deaths += 1;
        sim.deathReason = kind === "saw" ? "saw" : "spike";
        sim.camera.shake = 3;
        events.died = true;
        emit(sim, "burst", p.x + p.w / 2, p.y + p.h / 2, 12, "#c45c4a");
        break;
      }
    }
    if (!events.died) {
      for (const b of sim.world.bolts) {
        if (overlaps(p.x + 4, p.y + 6, p.w - 8, p.h - 8, b.x, b.y, b.w, b.h)) {
          p.deadTimer = 0.45;
          sim.deaths += 1;
          sim.deathReason = "arrow";
          sim.camera.shake = 3;
          events.died = true;
          emit(sim, "burst", p.x + p.w / 2, p.y + p.h / 2, 10, "#e8a050");
          b.life = 0;
          break;
        }
      }
    }
    if (!events.died) {
      for (const d of sim.world.drips ?? []) {
        if (overlaps(p.x + 4, p.y + 6, p.w - 8, p.h - 8, d.x, d.y, d.w, d.h)) {
          p.deadTimer = 0.45;
          sim.deaths += 1;
          sim.deathReason = "drip";
          sim.camera.shake = 3;
          events.died = true;
          emit(sim, "burst", p.x + p.w / 2, p.y + p.h / 2, 10, "#e07040");
          d.life = 0;
          break;
        }
      }
    }
  }

  if (events.died) return events;

  for (const c of sim.world.coins) {
    if (c.taken) continue;
    c.bob += dt * 3;
    const cy = c.y + Math.sin(c.bob) * 4;
    const dx = p.x + p.w / 2 - c.x;
    const dy = p.y + p.h / 2 - cy;
    if (dx * dx + dy * dy < (c.r + 14) * (c.r + 14)) {
      c.taken = true;
      sim.coins += 1;
      events.coined = true;
      emit(sim, "spark", c.x, cy, 10, "#e8c56b");
    }
  }

  for (const cp of sim.world.checkpoints) {
    if (!columnHit(p.x, p.w, cp.x, cp.w, 18)) continue;
    if (!cp.active) {
      cp.active = true;
      events.checkpoint = true;
      emit(sim, "spark", cp.x + cp.w / 2, cp.y + 22, 6, "#f0c56a");
    }
    const spawn = spawnFromCheckpoint(cp, sim.world);
    p.spawnX = spawn.x;
    p.spawnY = spawn.y;
  }

  const f = sim.world.flag;
  if (!sim.won && p.grounded && columnHit(p.x, p.w, f.x, f.w, 10)) {
    sim.won = true;
    events.won = true;
  }
  if (sim.won) sim.flagRaise = Math.min(1, sim.flagRaise + dt / 0.7);

  p.animTime += dt;
  if (!p.grounded) p.anim = p.vy < -40 ? "jump" : "fall";
  else if (Math.abs(p.vx) > 18) p.anim = "run";
  else p.anim = "idle";

  let live = 0;
  for (const part of sim.particles) {
    part.life -= dt;
    if (part.life <= 0) continue;
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.vy += (part.kind === "confetti" ? 220 : 420) * dt;
    sim.particles[live] = part;
    live += 1;
  }
  sim.particles.length = live;

  const vw = sim.viewW || VIEW_W;
  const vh = sim.viewH || VIEW_H;
  const lookTarget = p.vx * 0.12;
  sim.camera.look += (lookTarget - sim.camera.look) * Math.min(1, 5 * dt);
  const maxX = Math.max(0, sim.world.width - vw);
  const center = p.x + p.w / 2 - vw / 2;
  const targetX = Math.max(0, Math.min(maxX, center + sim.camera.look));
  sim.camera.x += (targetX - sim.camera.x) * Math.min(1, 10 * dt);
  sim.camera.x = Math.max(0, Math.min(maxX, sim.camera.x));
  sim.camera.y = sim.world.height - vh;
  sim.camera.shake *= Math.max(0, 1 - 8 * dt);

  return events;
}
