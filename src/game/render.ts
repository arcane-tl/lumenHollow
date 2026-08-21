import { BOUNCE_SQUASH, VIEW_H, VIEW_W } from "./constants";
import type { GameImages } from "./assets";
import type { Sim } from "./sim";
import type { Flag, Hazard, LevelTheme, Platform, PlatformSprite, World } from "./types";

const THEMES: Record<LevelTheme, { a: string; b: string; c: string; veil: string }> = {
  moss: { a: "#6a7b90", b: "#5a6b80", c: "#3a4038", veil: "rgba(28,32,38,0)" },
  ember: { a: "#7a5348", b: "#5a3a34", c: "#2c201c", veil: "rgba(90,32,16,0.22)" },
  indigo: { a: "#4a5878", b: "#343e58", c: "#1c2030", veil: "rgba(24,28,64,0.22)" },
  ash: { a: "#6a6862", b: "#48463f", c: "#2a2824", veil: "rgba(16,14,12,0.18)" },
  thorn: { a: "#4a5868", b: "#3a4450", c: "#2a3028", veil: "rgba(40,24,48,0.18)" },
  cinder: { a: "#6a4a40", b: "#4a3028", c: "#241814", veil: "rgba(80,28,16,0.24)" },
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
  tight = false,
) {
  const insetX = tight ? 2 : Math.round(img.width * 0.1);
  const insetY = tight ? 2 : Math.round(img.height * 0.08);
  const sw = Math.max(8, img.width - insetX * 2);
  const sh = Math.max(8, img.height - insetY * 2);
  ctx.drawImage(img, insetX, insetY, sw, sh, p.x - 1, p.y - 2, p.w + 2, p.h + 4);
}

function drawAct1Ledge(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  p: Pick<Platform, "x" | "y" | "w" | "h">,
) {
  const y = p.y - 2;
  const h = p.h + 4;
  const capSrc = Math.max(24, Math.round(img.width * 0.12));
  const destCap = Math.min(34, Math.max(22, p.w * 0.16));
  if (p.w < destCap * 2 + 8) {
    ctx.drawImage(img, p.x - 1, y, p.w + 2, h);
    return;
  }
  const inset = capSrc;
  const midSrcW = Math.max(16, img.width - inset * 2);

  ctx.drawImage(img, 0, 0, capSrc, img.height, p.x - 1, y, destCap, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x + destCap - 2, y, p.w - 2 * destCap + 4, h);
  ctx.clip();
  ctx.drawImage(
    img,
    inset,
    0,
    midSrcW,
    img.height,
    p.x + destCap - 2,
    y,
    p.w - 2 * destCap + 4,
    h,
  );
  ctx.restore();

  ctx.drawImage(
    img,
    img.width - capSrc,
    0,
    capSrc,
    img.height,
    p.x + p.w - destCap + 1,
    y,
    destCap,
    h,
  );
}

function bedFill(sprite: PlatformSprite) {
  if (sprite === "iron") return "#2a1814";
  if (sprite === "wood") return "#241c14";
  return "#3a4038";
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
  flipSecond = true,
  worldW = 0,
) {
  const destH = viewH + 80;
  const aspectW = Math.round(destH * (img.width / Math.max(1, img.height - srcTop)));
  const coverW = viewW + 40;
  const noWrapW = worldW > 0 ? Math.ceil((Math.max(0, worldW - viewW) * factor + viewW)) : 0;
  const destW = Math.max(coverW, aspectW, noWrapW);
  const shift = wrap(camX * factor, destW);
  const x0 = -wrap(shift, destW);
  blitLayer(ctx, img, x0 - 1, yOff, destW + 2, destH, false, srcTop);
  blitLayer(ctx, img, x0 + destW - 1, yOff, destW + 2, destH, flipSecond, srcTop);
  if (!flipSecond) {
    blitLayer(ctx, img, x0 + destW * 2 - 1, yOff, destW + 2, destH, false, srcTop);
  }
}

function drawGroundBed(
  ctx: CanvasRenderingContext2D,
  images: GameImages | null,
  plat: Platform,
  viewBottom: number,
) {
  const act2 = plat.sprite === "wood" || plat.sprite === "iron";
  const img = act2
    ? plat.sprite === "iron"
      ? images?.ironGround ?? images?.iron ?? images?.stone
      : images?.woodGround ?? images?.wood ?? images?.moss
    : images?.ground ?? images?.moss;
  const top = plat.y - 1;
  const h = act2 ? Math.max(plat.h + 8, viewBottom - top + 4) : plat.h + 8;

  if (!img) {
    ctx.fillStyle = "#4a4e46";
    ctx.fillRect(plat.x, top, plat.w, h);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(plat.x, top, plat.w, h);
  ctx.clip();

  if (act2) {
    const capSrc = Math.max(24, Math.round(img.width * 0.12));
    const destCap = Math.min(56, Math.max(32, plat.w * 0.12));
    const inset = Math.round(img.width * 0.14);
    const midSrcW = Math.max(48, img.width - inset * 2);
    const srcY = Math.round(img.height * 0.03);
    const srcH = Math.max(24, img.height - srcY - 2);

    ctx.drawImage(img, 0, srcY, capSrc, srcH, plat.x, top, destCap, h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(plat.x + destCap - 3, top, Math.max(0, plat.w - destCap * 2 + 6), h);
    ctx.clip();
    const tile = Math.max(96, Math.round(midSrcW * 0.22));
    let x = plat.x + destCap - 3;
    while (x < plat.x + plat.w - destCap + 3) {
      ctx.drawImage(img, inset, srcY, midSrcW, srcH, x, top, tile, h);
      x += tile - 6;
    }
    ctx.restore();

    ctx.save();
    ctx.translate(plat.x + plat.w, top);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, srcY, capSrc, srcH, 0, 0, destCap, h);
    ctx.restore();
    ctx.restore();
    return;
  }

  const inset = Math.round(img.width * 0.16);
  const midSrcW = Math.max(16, img.width - inset * 2);
  const capSrc = Math.max(20, Math.round(img.width * 0.15));
  const destCap = Math.min(48, Math.max(28, plat.w * 0.12));

  ctx.drawImage(img, 0, 0, capSrc, img.height, plat.x, top, destCap, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plat.x + destCap - 3, top, Math.max(0, plat.w - destCap * 2 + 6), h);
  ctx.clip();
  let x = plat.x + destCap - 3;
  const tile = 140;
  while (x < plat.x + plat.w - destCap + 3) {
    ctx.drawImage(img, inset, 0, midSrcW, img.height, x, top, tile, h);
    x += tile - 3;
  }
  ctx.restore();

  ctx.save();
  ctx.translate(plat.x + plat.w, top);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, capSrc, img.height, 0, 0, destCap, h);
  ctx.restore();
  ctx.restore();
}

function bounceSquash(plat: Platform) {
  const t = plat.squash ?? 0;
  if (t <= 0) return 0;
  return Math.sin((t / BOUNCE_SQUASH) * Math.PI);
}

function drawBounce(ctx: CanvasRenderingContext2D, images: GameImages | null, plat: Platform) {
  const k = bounceSquash(plat);
  const sx = 1 + 0.16 * k;
  const sy = 1 - 0.38 * k;
  const cx = plat.x + plat.w / 2;
  ctx.save();
  ctx.translate(cx, plat.y);
  ctx.scale(sx, sy);
  if (plat.sprite === "iron") {
    ctx.strokeStyle = "#6a4a38";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const coils = 5;
    const sh = 36;
    for (let i = 0; i <= coils * 10; i++) {
      const t = i / (coils * 10);
      const x = Math.sin(t * coils * Math.PI * 2) * 9;
      const y = 6 + t * sh;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#2a1814";
    ctx.fillRect(-plat.w / 2 - 1, -2, plat.w + 2, plat.h + 6);
    if (images?.iron) {
      drawNine(ctx, images.iron, { x: -plat.w / 2, y: -2, w: plat.w, h: plat.h + 4 }, true);
    }
  } else if (images?.cap) {
    const visW = plat.w + 22;
    const visH = 68;
    ctx.drawImage(images.cap, -visW / 2, -8, visW, visH);
  } else {
    ctx.fillStyle = "#4a6a38";
    ctx.fillRect(-plat.w / 2, -2, plat.w, plat.h + 4);
  }
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, images: GameImages | null, plat: Platform, viewBottom: number, time: number) {
  const look = timedLook(plat, time);
  if (!look.on && plat.kind === "timed") return;
  ctx.save();
  if (look.shake) ctx.translate(look.shake, 0);
  if (plat.kind === "bounce") {
    drawBounce(ctx, images, plat);
    ctx.restore();
    return;
  }
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
        : plat.sprite === "wood"
          ? images.wood
          : plat.sprite === "iron"
            ? images.iron
            : images.moss
    : null;
  const tight = plat.sprite === "wood" || plat.sprite === "iron";

  if (!tight && img) {
    const gone = look.gone;
    const blocks = look.blocks;
    const bw = plat.w / blocks;
    const start = plat.kind === "timed" ? gone : 0;
    const body = { x: plat.x + start * bw, y: plat.y, w: plat.w - start * bw, h: plat.h };
    ctx.fillStyle = "rgba(8, 9, 10, 0.28)";
    ctx.beginPath();
    ctx.ellipse(body.x + body.w / 2, body.y + body.h - 1, body.w * 0.42, Math.min(7, body.h * 0.18), 0, 0, Math.PI * 2);
    ctx.fill();
    drawAct1Ledge(ctx, img, body);
    if (look.warn) {
      ctx.fillStyle = "rgba(90, 48, 28, 0.28)";
      ctx.fillRect(body.x + 1, body.y, body.w - 2, 3);
    }
    ctx.restore();
    return;
  }

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
    if (tight) {
      ctx.fillStyle = bedFill(plat.sprite);
      ctx.fillRect(slice.x + 1, slice.y + 3, slice.w - 2, slice.h - 3);
    }
    if (img) drawNine(ctx, img, slice, tight);
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

function drawTurret(ctx: CanvasRenderingContext2D, images: GameImages | null, h: Hazard, time: number, theme: LevelTheme) {
  const charge = h.interval ? 1 - Math.max(0, Math.min(1, (h.cool ?? 0) / h.interval)) : 0;
  const firing = (h.cool ?? 1) < 0.28;
  const cx = h.x + h.w / 2;
  const down = (h.dir?.y ?? 0) > 0;
  const left = (h.dir?.x ?? 1) < 0;
  const mill = theme === "cinder";
  const art = mill ? images?.cinderTurret ?? images?.turret : images?.turret;
  if (down && art) {
    const surface = h.y + h.h;
    ctx.save();
    ctx.translate(cx, surface);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(art, 1, mill ? -18 : -16, mill ? 44 : 38, mill ? 36 : 32);
    ctx.restore();
  } else if (art) {
    ctx.save();
    ctx.translate(cx, h.y + h.h);
    if (left) ctx.scale(-1, 1);
    ctx.drawImage(art, mill ? -24 : -20, mill ? -42 : -36, mill ? 48 : 40, mill ? 44 : 38);
    ctx.restore();
  } else {
    ctx.fillStyle = mill ? "#3a2420" : "#3a322c";
    ctx.fillRect(h.x, h.y + 8, h.w, h.h - 8);
    ctx.fillStyle = firing ? "#e8a050" : mill ? "#8a4a32" : "#8a5a3a";
    ctx.fillRect(h.x + 8, h.y + 12, h.w - 16, 8);
  }
  if (firing || charge > 0.72) {
    const mx = cx;
    const my = down ? h.y + h.h + 28 : h.y + h.h / 2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(mx, my, 2, mx, my, 20);
    const glow = mill
      ? `rgba(255, 140, 70, ${firing ? 0.5 : 0.18})`
      : `rgba(180, 210, 90, ${firing ? 0.45 : 0.16})`;
    g.addColorStop(0, glow);
    g.addColorStop(1, mill ? "rgba(180, 60, 20, 0)" : "rgba(120, 160, 50, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(mx - 22, my - 22, 44, 44);
    ctx.restore();
  }
}

function drawBolt(
  ctx: CanvasRenderingContext2D,
  images: GameImages | null,
  b: { x: number; y: number; w: number; h: number; vx: number; vy: number },
  theme: LevelTheme,
) {
  const ang = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
  ctx.rotate(ang);
  const art = theme === "cinder" ? images?.cinderBolt ?? images?.bolt : images?.bolt;
  if (art) {
    ctx.drawImage(art, -16, -5, 32, 10);
  } else {
    ctx.fillStyle = theme === "cinder" ? "#e07040" : "#e8c070";
    ctx.fillRect(-14, -3, 28, 6);
  }
  ctx.restore();
}

function drawIronPole(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number) {
  const top = Math.min(y0, y1);
  const bot = Math.max(y0, y1);
  ctx.fillStyle = "#1c1814";
  ctx.fillRect(x - 4.5, top, 9, bot - top);
  ctx.fillStyle = "#4a3a32";
  ctx.fillRect(x - 2.5, top, 5, bot - top);
  ctx.fillStyle = "#6a5a50";
  for (let y = top + 8; y < bot - 4; y += 14) ctx.fillRect(x - 1.5, y, 3, 2);
}

function drawSaw(ctx: CanvasRenderingContext2D, images: GameImages | null, h: Hazard, time: number, platforms: Platform[]) {
  const cx = h.x + h.w / 2;
  const cy = h.y + h.h / 2;
  const rad = Math.max(h.w, h.h) / 2;

  let floorY: number | null = null;
  for (const p of platforms) {
    if (p.kind === "bounce") continue;
    if (cx < p.x + 2 || cx > p.x + p.w - 2) continue;
    if (p.y < cy + 4) continue;
    if (floorY == null || p.y < floorY) floorY = p.y;
  }
  if (floorY != null && floorY - (cy + rad) < 140) {
    drawIronPole(ctx, cx, cy, floorY);
    ctx.fillStyle = "#1c1814";
    ctx.fillRect(cx - 11, floorY - 5, 22, 7);
  } else {
    const beamY = cy - Math.max(58, rad + 38);
    drawIronPole(ctx, cx, beamY, cy);
    ctx.fillStyle = "#1c1814";
    ctx.fillRect(cx - 20, beamY - 5, 40, 8);
    ctx.fillStyle = "#4a3a32";
    ctx.fillRect(cx - 18, beamY - 3, 36, 4);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 8);
  const s = rad * 2;
  if (images?.saw) ctx.drawImage(images.saw, -s / 2, -s / 2, s, s);
  else {
    ctx.fillStyle = "#8a8a90";
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpout(ctx: CanvasRenderingContext2D, images: GameImages | null, h: Hazard, viewTop: number) {
  const cx = h.x + h.w / 2;
  const visW = Math.max(48, h.w + 18);
  const visH = h.h;
  const dx = cx - visW / 2;
  const riserW = Math.round(visW * 0.62);
  const rx = cx - riserW / 2;
  const riserTop = viewTop - 24;
  const riserBot = h.y + 10;
  if (images?.pipeRiser && riserBot > riserTop) {
    const segH = Math.max(36, Math.round(riserW * (images.pipeRiser.height / Math.max(1, images.pipeRiser.width))));
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx - 2, riserTop, riserW + 4, riserBot - riserTop);
    ctx.clip();
    for (let y = riserTop; y < riserBot; y += segH - 4) {
      ctx.drawImage(images.pipeRiser, rx, y, riserW, segH);
    }
    ctx.restore();
  }
  if (images?.spout) ctx.drawImage(images.spout, dx, h.y, visW, visH);
  else {
    ctx.fillStyle = "#4a3a32";
    ctx.fillRect(h.x, h.y, h.w, h.h);
  }
}

function drawHazard(ctx: CanvasRenderingContext2D, images: GameImages | null, h: Hazard, time: number, world: World, viewTop: number) {
  if (h.kind === "turret") {
    drawTurret(ctx, images, h, time, world.theme);
    return;
  }
  if (h.kind === "saw") {
    drawSaw(ctx, images, h, time, world.platforms);
    return;
  }
  if (h.kind === "spout") {
    drawSpout(ctx, images, h, viewTop);
    return;
  }
  const pulse = 0.5 + Math.sin(time * 5.2) * 0.18;
  const bramble = h.style === "bramble";
  const visH = bramble ? h.h + 6 : h.h + 12;
  const visY = bramble ? h.y + h.h - visH : h.y - 4;

  if (images) {
    const teeth = bramble ? images.bramble : images.spikes;
    const n = Math.max(1, Math.round(h.w / (bramble ? 72 : 64)));
    const tw = h.w / n;
    for (let i = 0; i < n; i++) {
      ctx.drawImage(teeth, h.x + i * tw - 1, visY, tw + 2, visH);
    }
  } else {
    drawIronTeeth(ctx, h, pulse);
  }
}

function drawCheckpoint(
  ctx: CanvasRenderingContext2D,
  images: GameImages | null,
  cp: { x: number; y: number; w: number; h: number; active: boolean; style?: string },
) {
  const censer = cp.style === "censer";
  const dw = censer ? 36 : 28;
  const dh = censer ? 52 : 58;
  const dx = cp.x + cp.w / 2 - dw / 2;
  const dy = cp.y + cp.h - dh + (censer ? 2 : 8);
  const img = images
    ? censer
      ? cp.active
        ? images.censerLit
        : images.censer
      : cp.style === "brazier"
        ? cp.active
          ? images.brazierLit
          : images.brazier
        : cp.active
          ? images.checkpointLit
          : images.checkpoint
    : null;
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
  cp: { x: number; y: number; w: number; h: number; active: boolean; style?: string },
  time: number,
) {
  if (!cp.active) return;
  const censer = cp.style === "censer";
  const dh = censer ? 52 : 58;
  const dy = cp.y + cp.h - dh + (censer ? 2 : 8);
  const cx = cp.x + cp.w / 2;
  const lampY = dy + (censer ? 14 : 16);
  const pulse = 0.5 + Math.sin(time * 6.2) * 0.12;
  ctx.fillStyle = censer
    ? `rgba(186, 92, 255, ${0.12 + pulse * 0.1})`
    : `rgba(255, 186, 78, ${0.1 + pulse * 0.08})`;
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

function drawVictoryFlag(
  ctx: CanvasRenderingContext2D,
  images: GameImages | null,
  f: Flag,
  raise: number,
  time: number,
) {
  const groundY = f.y + f.h;
  const poleW = 9;
  const poleH = f.h + 64;
  const px = f.x + 7;
  const py = groundY - poleH + 14;
  const t = Math.max(0, Math.min(1, raise));
  const clothH = Math.round(poleH * 0.4);
  const clothW = images?.flagCloth
    ? Math.round(clothH * (images.flagCloth.width / Math.max(1, images.flagCloth.height)))
    : Math.round(clothH * 1.45);
  const hoistX = px - 1;
  const topY = py + poleH * 0.17;
  const botY = groundY - clothH - 6;
  const clothY = botY + (topY - botY) * t;

  ctx.fillStyle = "rgba(28, 22, 16, 0.5)";
  ctx.beginPath();
  ctx.ellipse(px + poleW / 2, groundY + 4, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (images?.flagPole) ctx.drawImage(images.flagPole, px - 1, py, poleW + 2, poleH);
  else {
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(px, py, poleW, poleH);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(px - 1, py, poleW + 2, 10);
  }

  const cx = px + poleW / 2;
  ctx.fillStyle = "#1c1612";
  ctx.fillRect(cx - poleW / 2 - 2, groundY - 5, poleW + 4, 8);
  ctx.fillStyle = "#4a3a2c";
  ctx.fillRect(cx - poleW / 2 - 1, groundY - 4, poleW + 2, 3);
  ctx.fillStyle = "#2a2018";
  ctx.fillRect(cx - poleW / 2 - 1, groundY + 1, poleW + 2, 3);

  if (images?.flagCloth) ctx.drawImage(images.flagCloth, hoistX, clothY, clothW, clothH);
  else if (images?.flag) ctx.drawImage(images.flag, hoistX, clothY, clothW, clothH);
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
    const act2 = sim.world.theme === "thorn" || sim.world.theme === "cinder";
    const pack =
      sim.world.theme === "thorn"
        ? { sky: images.thornSky, far: images.thornFar, mid: images.thornMid, near: images.thornNear }
        : sim.world.theme === "cinder"
          ? { sky: images.cinderSky, far: images.cinderFar, mid: images.cinderMid, near: images.cinderNear }
          : { sky: images.sky, far: images.far, mid: images.mid, near: images.near };
    if (act2) {
      drawParallax(ctx, pack.sky, 0.03, -40, cx, vw, vh, 0, false);
      drawParallax(ctx, pack.far, 0.1, -16, cx, vw, vh, 0, false);
      drawParallax(ctx, pack.mid, 0.22, -8, cx, vw, vh, 0, false);
      drawParallax(ctx, pack.near, 0.4, 0, cx, vw, vh, 0, false);
    } else {
      drawParallax(ctx, pack.sky, 0.03, -80, cx, vw, vh, Math.round(pack.sky.height * 0.62), true);
      drawParallax(ctx, pack.far, 0.1, -72, cx, vw, vh, Math.round(pack.far.height * 0.22), true);
      drawParallax(ctx, pack.mid, 0.22, -28, cx, vw, vh, Math.round(pack.mid.height * 0.08), true);
      drawParallax(ctx, pack.near, 0.4, -4, cx, vw, vh, 0, true);
    }
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
    drawHazard(ctx, images, h, sim.time, sim.world, cy);
  }

  for (const b of sim.world.bolts ?? []) {
    drawBolt(ctx, images, b, sim.world.theme);
  }
  for (const d of sim.world.drips ?? []) {
    if (images?.drip) ctx.drawImage(images.drip, d.x - 2, d.y - 2, d.w + 4, d.h + 4);
    else {
      ctx.fillStyle = "#e07040";
      ctx.fillRect(d.x, d.y, d.w, d.h);
    }
  }

  for (const cp of sim.world.checkpoints) {
    drawCheckpoint(ctx, images, cp);
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

  const f = sim.world.flag;
  drawVictoryFlag(ctx, images, f, sim.flagRaise, sim.time);

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
