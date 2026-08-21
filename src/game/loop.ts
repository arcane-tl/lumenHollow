import { MAX_FRAME, STEP } from "./constants";
import { JuiceAudio } from "./audio";
import { loadImages, type GameImages } from "./assets";
import { Input } from "./input";
import { fitTransform, paintStage, renderWorld } from "./render";
import { burstConfetti, createSim, resetSim, respawnAtCheckpoint, stepSim, tickWinFx, type Sim } from "./sim";
import { recordClear, recordScore } from "./save";
import { previewRankList, wouldRankList } from "./scores";
import { fetchLevelScores, isCloudOn, submitLevelScore } from "./cloud";
import { useGameStore } from "./store";
import { LEVELS } from "./levels";
import { pushHudTime } from "./hudTime";

export interface GameHandle {
  startLevel: (id: number) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  respawn: () => void;
  toTitle: () => void;
  toSelect: () => void;
  submitScore: (name: string) => void;
  toBoard: () => void;
  toggleMute: () => void;
  input: Input;
  destroy: () => void;
}

declare global {
  interface Window {
    __controlsTest?: {
      getX: () => number;
      getY: () => number;
      getVx: () => number;
      getFacing: () => number;
      setKeys: (codes: string[] | null) => void;
      setPos?: (x: number, y: number) => void;
      setVel?: (vx: number, vy: number) => void;
      getJumpsLeft?: () => number;
      getGrounded?: () => boolean;
      getVy?: () => number;
      armJump?: () => void;
      setTouch?: (partial: { left?: boolean; right?: boolean; jump?: boolean }) => void;
      startLevel?: (id: number) => void;
      setOverlay?: (name: string) => void;
      forceQualify?: () => void;
      getLayout?: () => {
        spawnX: number;
        spawnY: number;
        hazards: { x: number; y: number; w: number; h: number }[];
        checkpoints: { x: number; y: number; w: number; h: number; active: boolean }[];
        platforms: { x: number; y: number; w: number; h: number }[];
        crumbles?: { x: number; gone: number; phase: string; blocks: number }[];
      } | null;
    };
  }
}

function grabPlayFocus(canvas: HTMLCanvasElement) {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  canvas.tabIndex = 0;
  canvas.focus({ preventScroll: true });
}

export function mountGame(canvas: HTMLCanvasElement): GameHandle {
  const input = new Input();
  const detach = input.attach();
  const audio = new JuiceAudio();
  let images: GameImages | null = null;
  let sim: Sim | null = null;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let running = true;
  let flash = 0;
  let currentLevel = 0;

  const store = useGameStore.getState;
  store().patch({ ready: true, muted: audio.isMuted() });

  const unlockAudio = () => {
    audio.unlock();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  void loadImages()
    .then((imgs) => {
      images = imgs;
      store().patch({ ready: true });
    })
    .catch(() => {
      store().patch({ ready: true });
    });

  const syncHud = () => {
    if (!sim) return;
    const s = store();
    if (s.overlay === "title" || s.overlay === "select") return;
    const doubleReady = !sim.player.grounded ? sim.player.jumpsLeft > 0 : true;
    if (
      s.coins === sim.coins &&
      s.totalCoins === sim.totalCoins &&
      s.deaths === sim.deaths &&
      s.deathReason === sim.deathReason &&
      s.levelId === sim.world.id &&
      s.levelName === sim.world.name
    ) {
      return;
    }
    store().patch({
      coins: sim.coins,
      totalCoins: sim.totalCoins,
      deaths: sim.deaths,
      deathReason: sim.deathReason,
      levelId: sim.world.id,
      levelName: sim.world.name,
    });
  };

  const startLevel = (id: number) => {
    currentLevel = id;
    sim = createSim(id);
    store().setOverlay("none");
    store().patch({
      levelId: id,
      levelName: LEVELS[id]?.name ?? "Level",
      coins: 0,
      totalCoins: sim.totalCoins,
      deaths: 0,
      deathReason: null,
      runTime: 0,
      lastRank: null,
    });
    audio.unlock();
    const theme = LEVELS[id]?.theme ?? "moss";
    audio.playBed(theme === "thorn" || theme === "cinder");
    grabPlayFocus(canvas);
    pushHudTime(0);
  };

  let ctx: CanvasRenderingContext2D | null = null;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const raw = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    acc += raw;
    const overlay = store().overlay;
    input.setMenuMode(overlay !== "none");
    const actions = input.poll();

    if (overlay === "none" && actions.pausePressed && sim && !sim.won) {
      store().patch({ runTime: sim.time });
      store().setOverlay("paused");
    } else if (overlay === "paused" && actions.pausePressed) {
      store().setOverlay("none");
      grabPlayFocus(canvas);
    }
    if (overlay === "none" && actions.restartPressed && sim) {
      resetSim(sim, currentLevel);
    }

    if (sim && overlay !== "none" && sim.won) tickWinFx(sim, raw);

    if (sim && overlay === "none") {
      let offeredJump = false;
      let steps = 0;
      while (acc >= STEP && steps < 4) {
        steps += 1;
        if (offeredJump) actions.jumpPressed = false;
        const ev = stepSim(sim, actions, STEP);
        if (actions.jumpPressed) {
          offeredJump = true;
          input.consumeJump();
        }
        if (ev.jumped) audio.jump();
        if (ev.doubleJumped) audio.doubleJump();
        if (ev.landed) audio.land();
        if (ev.coined) audio.coin();
        if (ev.checkpoint) audio.checkpoint();
        if (ev.died) {
          audio.death();
          flash = 0.28;
          store().setOverlay("dead");
        }
        if (ev.won) {
          audio.win();
          const snap = sim;
          const cleared = recordClear(snap.world.id, snap.coins, store().save);
          store().applySave(cleared);
          store().patch({ runTime: snap.time });
          void (async () => {
            const local = cleared.scores[String(snap.world.id)] ?? [];
            let remote: typeof local | null = null;
            if (isCloudOn()) remote = await fetchLevelScores(snap.world.id);
            if (remote) {
              store().patch({
                cloudByLevel: { ...store().cloudByLevel, [snap.world.id]: remote },
              });
            }
            const list = remote !== null ? remote : local;
            const ranked = wouldRankList(list, snap.coins, snap.time);
            store().patch({ lastRank: ranked ? previewRankList(list, snap.coins, snap.time) : null });
            if (ranked) {
              burstConfetti(snap, snap.world.flag.x + snap.world.flag.w / 2, snap.world.flag.y + 24);
              store().setOverlay("score");
            } else {
              store().setOverlay("won");
            }
          })();
        }
        acc -= STEP;
      }
      if (acc > STEP) acc = STEP;
      syncHud();
      pushHudTime(sim.time);
    } else {
      acc = 0;
    }

    flash = Math.max(0, flash - raw * 1.4);
    const { scale, ox, oy, dpr, viewW, viewH, resized } = fitTransform(canvas);
    if (sim) {
      sim.viewW = viewW;
      sim.viewH = viewH;
    }
    if (!ctx || resized) ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!sim) paintStage(ctx, images, canvas.width, canvas.height);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (sim) renderWorld(ctx, sim, images, flash);
    }
    audio.pump();
    if (!running) cancelAnimationFrame(raf);
  };

  raf = requestAnimationFrame(frame);

  window.__controlsTest = {
    getX: () => sim?.player.x ?? 0,
    getY: () => sim?.player.y ?? 0,
    getVx: () => sim?.player.vx ?? 0,
    getFacing: () => sim?.player.facing ?? 1,
    setKeys: (codes) => input.setQaKeys(codes),
    setPos: (x: number, y: number) => {
      if (!sim) return;
      sim.player.x = x;
      sim.player.y = y;
      sim.player.vx = 0;
      sim.player.vy = 0;
      const maxX = Math.max(0, sim.world.width - (sim.viewW || 960));
      sim.camera.x = Math.max(0, Math.min(maxX, x - sim.viewW * 0.4));
    },
    setVel: (vx: number, vy: number) => {
      if (!sim) return;
      sim.player.vx = vx;
      sim.player.vy = vy;
    },
    getJumpsLeft: () => sim?.player.jumpsLeft ?? 0,
    getGrounded: () => sim?.player.grounded ?? false,
    getVy: () => sim?.player.vy ?? 0,
    armJump: () => input.armJump(),
    setTouch: (partial) => input.setTouch(partial),
    startLevel: (id: number) => startLevel(id),
    setOverlay: (name: string) => store().setOverlay(name as import("./types").Overlay),
    forceQualify: () => {
      store().patch({
        coins: 8,
        totalCoins: 8,
        runTime: 32.4,
        lastRank: 1,
        levelId: 0,
        levelName: "Moss Steps",
      });
      store().setOverlay("score");
    },
    getLayout: () =>
      sim
        ? {
            spawnX: sim.player.spawnX,
            spawnY: sim.player.spawnY,
            hazards: sim.world.hazards.map((h) => ({
              x: h.x,
              y: h.y,
              w: h.w,
              h: h.h,
              kind: h.kind,
              move: h.move ? { ...h.move } : undefined,
            })),
            checkpoints: sim.world.checkpoints.map((c) => ({
              x: c.x,
              y: c.y,
              w: c.w,
              h: c.h,
              active: c.active,
            })),
            platforms: sim.world.platforms.map((p) => ({
              x: p.x,
              y: p.y,
              w: p.w,
              h: p.h,
              kind: p.kind,
            })),
            flag: { ...sim.world.flag },
            width: sim.world.width,
            viewW: sim.viewW,
            camera: { x: sim.camera.x, look: sim.camera.look },
            bolts: (sim.world.bolts ?? []).map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h, vy: b.vy })),
            crumbles: sim.world.platforms
              .filter((p) => p.crumble)
              .map((p) => ({
                x: p.x,
                gone: p.crumble!.gone,
                phase: p.crumble!.phase,
                blocks: p.crumble!.blocks,
              })),
          }
        : null,
  };

  return {
    startLevel,
    pause: () => store().setOverlay("paused"),
    resume: () => {
      store().setOverlay("none");
      grabPlayFocus(canvas);
    },
    restart: () => {
      if (!sim) {
        startLevel(currentLevel);
        return;
      }
      resetSim(sim, currentLevel);
      pushHudTime(0);
      store().patch({ runTime: 0 });
      store().setOverlay("none");
      grabPlayFocus(canvas);
    },
    respawn: () => {
      if (!sim) return;
      flash = 0;
      respawnAtCheckpoint(sim);
      store().setOverlay("none");
      grabPlayFocus(canvas);
    },
    toTitle: () => {
      sim = null;
      store().setOverlay("title");
      audio.playBed(false);
    },
    toSelect: () => {
      sim = null;
      store().setOverlay("select");
    },
    toBoard: () => {
      sim = null;
      store().setOverlay("select");
    },
    toggleMute: () => {
      audio.unlock();
      const muted = audio.toggleMuted();
      store().patch({ muted });
    },
    submitScore: (name: string) => {
      if (!sim) {
        store().setOverlay("won");
        return;
      }
      const levelId = sim.world.id;
      const coins = sim.coins;
      const time = sim.time;
      const { save, rank } = recordScore(store().save, levelId, coins, time, name);
      store().applySave(save);
      store().patch({ lastRank: rank });
      const finish = () => {
        if (store().overlay === "score") store().setOverlay("won");
      };
      if (!isCloudOn()) {
        finish();
        return;
      }
      let done = false;
      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        finish();
      }, 3000);
      void submitLevelScore(levelId, save.lastName || name, coins, time).then((result) => {
        if (result.board) {
          store().patch({
            cloudByLevel: { ...store().cloudByLevel, [levelId]: result.board },
            lastRank: result.rank ?? rank,
          });
        }
      }).finally(() => {
        window.clearTimeout(timer);
        if (done) return;
        done = true;
        finish();
      });
    },
    input,
    destroy: () => {
      running = false;
      cancelAnimationFrame(raf);
      detach();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      delete window.__controlsTest;
    },
  };
}
