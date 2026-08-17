import { VIEW_H, VIEW_W } from "./constants";
import type { GameImages } from "./assets";
import type { Sim } from "./sim";
import type { Hazard, LevelTheme, Platform } from "./types";

const THEMES: Record<LevelTheme, { a: string; b: string; c: string; veil: string }> = {
  moss: { a: "#6a7b90", b: "#5a6b80", c: "#3a4038", veil: "rgba(28,32,38,0)" },
  ember: { a: "#7a5348", b: "#5a3a34", c: "#2c201c", veil: "rgba(90,32,16,0.22)" },
  indigo: { a: "#4a5878", b: "#343e58", c: "#1c2030", veil: "rgba(24,28,64,0.22)" },
  ash: { a: "#6a6862", b: "#48463f", c: "#2a2824", veil: "rgba(16,14,12,0.18)" },
};

const timedScratch = { on: true, warn: false, alpha: 1, shake: 0, gone: 0, blocks: 1 };
function timedLook(plat: Platform, t: number) {
  const c = plat.crumble;
  if (plat.kind !== "timed" || !c) {
    timedScratch.on = true;
    timedScratch.warn = false;
    timedScratch.shake = 0;
    timedScratch.gone = 0;
    timedScratch.blocks = 1;
    return timedScratch;
  }
  timedScratch.on = c.gone < c.blocks;
  timedScratch.warn = c.phase === "hold";
  timedScratch.shake = timedScratch.warn ? Math.sin(t * 18) * 0.4 : 0;
  timedScratch.gone = c.gone;
  timedScratch.blocks = c.blocks;
  return timedScratch;
}

function roundedClip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, rr);
  else ctx.rect(x, y, w, h);
  ctx.clip();
}

function drawNine(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  p: Pick<Platform, "x" | "y" | "w" | "h">,
) {
  const insetX = Math.round(img.width * 0.1);
  const insetY = Math.round(img.height * 0.08);
  const sw = Math.max(8, img.width - insetX * 2);
  const sh = Math.max(8, img.height - insetY * 2);
  ctx.drawImage(img, insetX, insetY, sw, sh, p.x - 1, p.y - 2, p.w + 2, p.h + 4);
}

function wrap(n: number, m: number) {
  return ((n % m) + m) % m;
}

function blitLayer(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  flip: boolean,
  srcY = 0,
) {
  const sy = srcY;
  const sh = Math.max(1, img.height - srcY);
  if (flip) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, sy, img.width, sh, 0, 0, w, h);
    ctx.restore();
    return;
  }
  ctx.drawImage(img, 0, sy, img.width, sh, x, y, w, h);
}

function drawParallax(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  factor: number,
  yOff: number,
  camX: number,
  viewW: number,
  viewH: number,
  srcTop = 0,
) {
  const destH = viewH + 80;
  const destW = Math.max(viewW + 40, Math.round(destH * (img.width / Math.max(1, img.height - srcTop))));
  const shift = wrap(camX * factor, destW);
  const x0 = -wrap(shift, destW);
  blitLayer(ctx, img, x0 - 1, yOff, destW + 2, destH, false, srcTop);
  blitLayer(ctx, img, x0 + destW - 1, yOff, destW + 2, destH, true, srcTop);
}

function drawGroundBed(
  ctx: CanvasRenderingContext2D,
  images: GameImages | null,
  plat: Platform,
  viewBottom: number,
) {
  const img = images?.ground ?? images?.moss;
  const top = plat.y - 1;
  const h = Math.max(plat.h + 8, viewBottom - top + 4);

  if (!img) {
    ctx.fillStyle = "#4a4e46";
    ctx.fillRect(plat.x, top, plat.w, h);
    return;
  }

  const inset = Math.round(img.width * 0.16);
  const midSrcW = Math.max(16, img.width - inset * 2);
  const capSrc = Math.max(20, Math.round(img.width * 0.15));
  const destCap = Math.min(48, Math.max(28, plat.w * 0.12));

  ctx.save();
  ctx.beginPath();
  ctx.rect(plat.x, top, plat.w, h);
  ctx.clip();

  ctx.drawImage(img, 0, 0, capSrc, img.height, plat.x, top, destCap, h);

  let x = plat.x + destCap - 3;
  const tile = 140;
  while (x < plat.x + plat.w - destCap + 3) {
    const w = Math.min(tile, plat.x + plat.w - destCap - x + 6);
    ctx.drawImage(img, inset, 0, midSrcW, img.height, x, top, w, h);
    x += Math.max(1, w - 3);
  }

  ctx.drawImage(
    img,
    img.width - capSrc,
    0,
    capSrc,
    img.height,
    plat.x + plat.w - destCap,
    top,
    destCap,
    h,
  );
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, images: GameImages | null, plat: Platform, viewBottom: number, time: number) {
  const look = timedLook(plat, time);
  if (!look.on && plat.kind === "timed") return;
  ctx.save();
  if (look.shake) ctx.translate(look.shake, 0);
  if (plat.h >= 50) {
    drawGroundBed(ctx, images, plat, viewBottom);
    ctx.restore();
    return;
  }

  const img = images
    ? plat.sprite === "raft"
      ? images.raft
      : plat.sprite === "stone"
        ? images.stone
        : images.moss
    : null;

  const gone = look.gone;
  const blocks = look.blocks;
  const bw = plat.w / blocks;
  const start = plat.kind === "timed" ? gone : 0;
  for (let i = start; i < blocks; i++) {
    const slice = { x: plat.x + i * bw, y: plat.y, w: bw + 1, h: plat.h };
    ctx.fillStyle = "rgba(8, 9, 10, 0.28)";
    ctx.beginPath();
    ctx.ellipse(slice.x + slice.w / 2, slice.y + slice.h - 1, slice.w * 0.42, Math.min(7, slice.h * 0.18), 0, 0, Math.PI * 2);
    ctx.fill();
    if (img) drawNine(ctx, img, slice);
    else {
      ctx.fillStyle = "#4a4e46";
      ctx.fillRect(slice.x, slice.y, slice.w, slice.h);
    }
    if (look.warn) {
      ctx.fillStyle = "rgba(90, 48, 28, 0.28)";
      ctx.fillRect(slice.x + 1, slice.y, slice.w - 2, 3);
    }
  }
  ctx.restore();
}

function drawIronTeeth(ctx: CanvasRenderingContext2D, h: Hazard, pulse: number) {
  const n = Math.max(3, Math.round(h.w / 18));
  const tw = h.w / n;
  const tipH = h.h;
  for (let i = 0; i < n; i++) {
    const x = h.x + i * tw;
    const mid = x + tw / 2;
    const lean = (i % 2 === 0 ? -1.2 : 1.2) * (tw * 0.04);
    ctx.beginPath();
    ctx.moveTo(x + 1.5, h.y + h.h + 2);
    ctx.lineTo(mid + lean, h.y - tipH + h.h);
    ctx.lineTo(x + tw - 1.5, h.y + h.h + 2);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? "#2a1c1a" : "#3a2420";
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 168, 122, ${0.28 + pulse * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mid + lean * 0.4 - 1, h.y - tipH + h.h + 2);
    ctx.lineTo(x + 4, h.y + h.h);
    ctx.stroke();
  }
}

function drawTurret(ctx: CanvasRenderingContext2D, images: GameImages | null, h: Hazard, time: number) {
  const charge = h.interval ? 1 - Math.max(0, Math.min(1, (h.cool ?? 0) / h.interval)) : 0;
  const firing = (h.cool ?? 1) < 0.28;
  const cx = h.x + h.w / 2;
  const down = (h.dir?.y ?? 0) > 0;
  const left = (h.dir?.x ?? 1) < 0;
  if (down && images?.turret) {
    const surface = h.y + h.h;
    ctx.save();
    ctx.translate(cx, surface);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(images.turret, 1, -16, 38, 32);
    ctx.restore();
  } else if (images?.turret) {
    ctx.save();
    ctx.translate(cx, h.y + h.h);
    if (left) ctx.scale(-1, 1);
    ctx.drawImage(images.turret, -20, -36, 40, 38);
    ctx.restore();
  } else {
    ctx.fillStyle = "#3a322c";
    ctx.fillRect(h.x, h.y + 8, h.w, h.h - 8);
    ctx.fillStyle = firing ? "#e8a050" : "#8a5a3a";
    ctx.fillRect(h.x + 8, h.y + 12, h.w - 16, 8);
  }
  if (firing || charge > 0.72) {
    const mx = cx;
    const my = down ? h.y + h.h + 28 : h.y + h.h / 2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(mx, my, 2, mx, my, 20);
    g.addColorStop(0, `rgba(180, 210, 90, ${firing ? 0.45 : 0.16})`);
    g.addColorStop(1, "rgba(120, 160, 50, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(mx - 22, my - 22, 44, 44);
    ctx.restore();
  }
}

function drawBolt(ctx: CanvasRenderingContext2D, images: GameImages | null, b: { x: number; y: number; w: number; h: number; vx: number; vy: number }) {
  const ang = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
  ctx.rotate(ang);
  if (images?.bolt) {
    ctx.drawImage(images.bolt, -16, -5, 32, 10);
  } else {
    ctx.fillStyle = "#e8c070";
    ctx.fillRect(-14, -3, 28, 6);
  }
  ctx.restore();
}

function drawHazard(ctx: CanvasRenderingContext2D, images: GameImages | null, h: Hazard, time: number) {
  if (h.kind === "turret") {
    drawTurret(ctx, images, h, time);
    return;
  }
  const pulse = 0.5 + Math.sin(time * 5.2) * 0.18;
  const visH = h.h + 12;
  const visY = h.y - 4;

  if (images) {
    const n = Math.max(1, Math.round(h.w / 64));
    const tw = h.w / n;
    for (let i = 0; i < n; i++) {
      ctx.drawImage(images.spikes, h.x + i * tw - 1, visY, tw + 2, visH);
    }
  } else {
    drawIronTeeth(ctx, h, pulse);
  }

  ctx.fillStyle = `rgba(236, 132, 96, ${0.18 + pulse * 0.1})`;
  ctx.fillRect(h.x + 2, h.y + h.h - 3, h.w - 4, 2);
}

function drawCheckpoint(
  ctx: CanvasRenderingContext2D,
  images: GameImages | null,
  cp: { x: number; y: number; w: number; h: number; active: boolean },
) {
  const dw = 28;
  const dh = 58;
  const dx = cp.x + cp.w / 2 - dw / 2;
  const dy = cp.y + cp.h - dh + 8;
  const img = images ? (cp.active ? images.checkpointLit : images.checkpoint) : null;
  if (img) ctx.drawImage(img, dx, dy, dw, dh);
  else {
    const cx = cp.x + cp.w / 2;
    ctx.fillStyle = cp.active ? "#e8c56b" : "#3a3a3c";
    ctx.fillRect(cx - 2, cp.y + 8, 4, cp.h - 8);
    if (cp.active) {
      ctx.fillStyle = "#ffd27a";
      ctx.beginPath();
      ctx.arc(cx, cp.y + 12, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCheckpointLight(
  ctx: CanvasRenderingContext2D,
  cp: { x: number; y: number; w: number; h: number; active: boolean },
  time: number,
) {
  if (!cp.active) return;
  const dh = 58;
  const dy = cp.y + cp.h - dh + 8;
  const cx = cp.x + cp.w / 2;
  const lampY = dy + 10;
  const pulse = 0.5 + Math.sin(time * 6.2) * 0.12;
  ctx.fillStyle = `rgba(255, 186, 78, ${0.1 + pulse * 0.08})`;
  ctx.beginPath();
  ctx.arc(cx, lampY, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 220, 140, ${0.22 + pulse * 0.1})`;
  ctx.beginPath();
  ctx.arc(cx, lampY, 12, 0, Math.PI * 2);
  ctx.fill();
}

function frameIndex(time: number, count: number, fps: number) {
  return Math.floor(time * fps) % count;
}

function drawSheet(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cols: number,
  rows: number,
  index: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  flip: boolean,
) {
  const cw = img.width / cols;
  const ch = img.height / rows;
  const col = index % cols;
  const row = Math.floor(index / cols) % rows;
  if (flip) {
    ctx.save();
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, col * cw, row * ch, cw, ch, 0, 0, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(img, col * cw, row * ch, cw, ch, dx, dy, dw, dh);
  }
}

function visible(x: number, y: number, w: number, h: number, cx: number, cy: number, vw: number, vh: number, pad = 90) {
  return x < cx + vw + pad && x + w > cx - pad && y < cy + vh + pad && y + h > cy - pad;
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  images: GameImages | null,
  flash: number,
) {
  const cam = sim.camera;
  const sx = cam.shake ? (Math.random() - 0.5) * Math.min(2.2, cam.shake) : 0;
  const sy = cam.shake ? (Math.random() - 0.5) * Math.min(2.2, cam.shake) : 0;
  const cx = cam.x;
  const cy = cam.y;
  const vw = sim.viewW || VIEW_W;
  const vh = sim.viewH || VIEW_H;
  const viewBottom = cy + vh;

  const theme = THEMES[sim.world.theme ?? "moss"];
  ctx.fillStyle = theme.b;
  ctx.fillRect(0, 0, vw, vh);

  if (images) {
    drawParallax(ctx, images.sky, 0.03, -80, cx, vw, vh, Math.round(images.sky.height * 0.62));
    drawParallax(ctx, images.far, 0.1, -72, cx, vw, vh, Math.round(images.far.height * 0.22));
    drawParallax(ctx, images.mid, 0.22, -28, cx, vw, vh, Math.round(images.mid.height * 0.08));
    drawParallax(ctx, images.near, 0.4, -4, cx, vw, vh);
  }

  ctx.fillStyle = theme.veil;
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(-cx + sx, -cy + sy);

  for (const plat of sim.world.platforms) {
    if (!visible(plat.x, plat.y, plat.w, plat.h + 80, cx, cy, vw, vh)) continue;
    drawPlatform(ctx, images, plat, viewBottom, sim.time);
  }

  for (const h of sim.world.hazards) {
    if (!visible(h.x, h.y - 20, h.w, h.h + 50, cx, cy, vw, vh)) continue;
    drawHazard(ctx, images, h, sim.time);
  }

  for (const b of sim.world.bolts ?? []) {
    drawBolt(ctx, images, b);
  }

  for (const c of sim.world.coins) {
    if (c.taken) continue;
    if (!visible(c.x - 16, c.y - 16, 32, 32, cx, cy, vw, vh)) continue;
    const y = c.y + Math.sin(c.bob) * 4;
    if (images) {
      const fi = frameIndex(sim.time, 4, 8);
      drawSheet(ctx, images.coin, 2, 2, fi, c.x - 14, y - 14, 28, 28, false);
    } else {
      ctx.fillStyle = "#d8c07a";
      ctx.beginPath();
      ctx.arc(c.x, y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const cp of sim.world.checkpoints) {
    drawCheckpoint(ctx, images, cp);
  }

  const f = sim.world.flag;
  if (images) ctx.drawImage(images.flag, f.x - 4, f.y - 6, f.w + 18, f.h + 8);
  else {
    ctx.fillStyle = "#d8d4cc";
    ctx.fillRect(f.x + 8, f.y, 5, f.h);
    ctx.fillStyle = "#cfc6b4";
    ctx.fillRect(f.x + 13, f.y + 8, 24, 16);
  }

  const p = sim.player;
  if (p.deadTimer <= 0) {
    const blink = p.invuln > 0 && Math.floor(sim.time * 18) % 2 === 0;
    if (!blink) {
      const dw = 46;
      const dh = 54;
      const dx = p.x + p.w / 2 - dw / 2;
      const dy = p.y + p.h - dh + 9;
      if (images) {
        if (p.anim === "run") {
          drawSheet(ctx, images.run, 3, 2, frameIndex(p.animTime, 6, 11), dx, dy, dw, dh, p.facing < 0);
        } else if (p.anim === "jump" || p.anim === "fall") {
          const ji = p.anim === "jump" ? (p.vy < -180 ? 1 : 2) : 3;
          drawSheet(ctx, images.jump, 2, 2, ji, dx, dy, dw, dh, p.facing < 0);
        } else {
          drawSheet(ctx, images.idle, 2, 2, frameIndex(p.animTime, 4, 5), dx, dy, dw, dh, p.facing < 0);
        }
      } else {
        ctx.fillStyle = "#c07048";
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }
  }

  for (const part of sim.particles) {
    ctx.globalAlpha = Math.max(0, part.life / part.max);
    ctx.fillStyle = part.color;
    ctx.fillRect(part.x, part.y, part.size, part.size);
    ctx.globalAlpha = 1;
  }

  for (const cp of sim.world.checkpoints) {
    drawCheckpointLight(ctx, cp, sim.time);
  }

  ctx.restore();

  if (flash > 0) {
    ctx.fillStyle = `rgba(236,232,225,${Math.min(0.35, flash)})`;
    ctx.fillRect(0, 0, vw, vh);
  }
}

export function paintStage(
  ctx: CanvasRenderingContext2D,
  images: GameImages | null,
  canvasW: number,
  canvasH: number,
) {
  const dusk = ctx.createLinearGradient(0, 0, 0, canvasH);
  dusk.addColorStop(0, "#6a7b90");
  dusk.addColorStop(0.5, "#5a6b80");
  dusk.addColorStop(1, "#3a4038");
  ctx.fillStyle = dusk;
  ctx.fillRect(0, 0, canvasW, canvasH);
  if (!images) return;

  const cover = (img: HTMLImageElement, zoom = 1, yBias = 0, alpha = 1, srcTop = 0) => {
    const srcH = Math.max(1, img.height - srcTop);
    const scale = Math.max(canvasW / img.width, canvasH / srcH) * zoom;
    const w = img.width * scale;
    const h = srcH * scale;
    const x = (canvasW - w) / 2;
    const y = canvasH - h + yBias;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, 0, srcTop, img.width, srcH, x, y, w, h);
    ctx.restore();
  };

  cover(images.sky, 1.08, 0, 1, Math.round(images.sky.height * 0.62));
  cover(images.far, 1.06, canvasH * 0.02, 0.94, Math.round(images.far.height * 0.22));
  cover(images.mid, 1.06, canvasH * 0.04, 0.68);
}

let fitCache = { cssW: 0, cssH: 0, dpr: 1, scale: 1, viewW: VIEW_W, viewH: VIEW_H };

export function fitTransform(
  canvas: HTMLCanvasElement,
): { scale: number; ox: number; oy: number; dpr: number; viewW: number; viewH: number; resized: boolean } {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = Math.max(1, canvas.clientWidth);
  const cssH = Math.max(1, canvas.clientHeight);
  if (cssW === fitCache.cssW && cssH === fitCache.cssH && dpr === fitCache.dpr) {
    return { scale: fitCache.scale, ox: 0, oy: 0, dpr, viewW: fitCache.viewW, viewH: fitCache.viewH, resized: false };
  }
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  let resized = false;
  if (Math.abs(canvas.width - bw) > 1 || Math.abs(canvas.height - bh) > 1) {
    canvas.width = bw;
    canvas.height = bh;
    resized = true;
  }
  let scale = cssH / VIEW_H;
  let viewW = cssW / scale;
  let viewH = VIEW_H;
  if (viewW < 680) {
    scale = cssW / 680;
    viewW = 680;
    viewH = cssH / scale;
  }
  fitCache = { cssW, cssH, dpr, scale, viewW, viewH };
  return { scale, ox: 0, oy: 0, dpr, viewW, viewH, resized };
}
