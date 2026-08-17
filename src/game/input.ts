import type { Actions } from "./types";

const GAME_CODES = new Set([
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "Escape",
  "KeyP",
  "KeyR",
]);

const JUMP_CODES = new Set(["Space", "KeyW", "ArrowUp"]);

export class Input {
  private keys = new Set<string>();
  private qaKeys: string[] | null = null;
  private prevJump = false;
  private prevPause = false;
  private prevRestart = false;
  private prevPadJump = false;
  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private jumpArmed = false;
  private menuMode = false;
  private padsOn = false;
  private out: Actions = {
    moveX: 0,
    jumpHeld: false,
    jumpPressed: false,
    downHeld: false,
    pausePressed: false,
    restartPressed: false,
  };

  attach() {
    const isTyping = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (this.menuMode) return;
      if (GAME_CODES.has(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.keys.add(e.code);
      if (JUMP_CODES.has(e.code) && !e.repeat) this.jumpArmed = true;
    };
    const up = (e: KeyboardEvent) => {
      if (isTyping(e) || this.menuMode) {
        this.keys.delete(e.code);
        return;
      }
      if (GAME_CODES.has(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.keys.delete(e.code);
    };
    const clear = () => this.keys.clear();
    window.addEventListener("keydown", down, { capture: true });
    window.addEventListener("keyup", up, { capture: true });
    window.addEventListener("blur", clear);
    const padOn = () => {
      this.padsOn = true;
    };
    window.addEventListener("gamepadconnected", padOn);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    return () => {
      window.removeEventListener("keydown", down, { capture: true } as EventListenerOptions);
      window.removeEventListener("keyup", up, { capture: true } as EventListenerOptions);
      window.removeEventListener("blur", clear);
      window.removeEventListener("gamepadconnected", padOn);
    };
  }

  setMenuMode(on: boolean) {
    this.menuMode = on;
    if (on) {
      this.keys.clear();
      this.jumpArmed = false;
      this.touchLeft = false;
      this.touchRight = false;
      this.touchJump = false;
    }
  }

  armJump() {
    this.jumpArmed = true;
  }

  consumeJump() {
    this.jumpArmed = false;
  }

  setQaKeys(codes: string[] | null) {
    const next = codes && codes.length ? codes : null;
    if (next) {
      const wasJump = this.qaKeys?.some((c) => JUMP_CODES.has(c)) ?? false;
      const nowJump = next.some((c) => JUMP_CODES.has(c));
      if (nowJump && !wasJump) this.jumpArmed = true;
    }
    this.qaKeys = next;
  }

  setTouch(partial: { left?: boolean; right?: boolean; jump?: boolean }) {
    if (partial.left !== undefined) this.touchLeft = partial.left;
    if (partial.right !== undefined) this.touchRight = partial.right;
    if (partial.jump !== undefined) {
      if (partial.jump && !this.touchJump) this.jumpArmed = true;
      this.touchJump = partial.jump;
    }
  }

  poll(): Actions {
    const held = this.qaKeys ? new Set(this.qaKeys) : this.keys;
    let moveX = 0;
    if (held.has("KeyA") || held.has("ArrowLeft") || this.touchLeft) moveX -= 1;
    if (held.has("KeyD") || held.has("ArrowRight") || this.touchRight) moveX += 1;

    const pads = this.padsOn && typeof navigator !== "undefined" ? (navigator.getGamepads?.() ?? []) : [];
    let padJump = false;
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] ?? 0;
      if (Math.abs(ax) > 0.25) moveX += Math.sign(ax);
      if (pad.buttons[14]?.pressed) moveX -= 1;
      if (pad.buttons[15]?.pressed) moveX += 1;
      if (pad.buttons[0]?.pressed || pad.buttons[12]?.pressed) padJump = true;
    }
    moveX = Math.max(-1, Math.min(1, moveX));

    if (padJump && !this.prevPadJump) this.jumpArmed = true;
    this.prevPadJump = padJump;

    let jumpHeld = held.has("Space") || held.has("KeyW") || held.has("ArrowUp") || this.touchJump || padJump;
    let pauseHeld = held.has("Escape") || held.has("KeyP");
    let restartHeld = held.has("KeyR");
    let downHeld = held.has("KeyS") || held.has("ArrowDown");

    for (const pad of pads) {
      if (!pad) continue;
      if (pad.buttons[9]?.pressed) pauseHeld = true;
      if (pad.buttons[13]?.pressed) downHeld = true;
    }

    const jumpPressed = this.jumpArmed || (jumpHeld && !this.prevJump);
    const pausePressed = pauseHeld && !this.prevPause;
    const restartPressed = restartHeld && !this.prevRestart;
    this.prevJump = jumpHeld;
    this.prevPause = pauseHeld;
    this.prevRestart = restartHeld;

    this.out.moveX = moveX;
    this.out.jumpHeld = jumpHeld;
    this.out.jumpPressed = jumpPressed;
    this.out.downHeld = downHeld;
    this.out.pausePressed = pausePressed;
    this.out.restartPressed = restartPressed;
    return this.out;
  }
}
