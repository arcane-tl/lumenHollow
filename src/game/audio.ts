const MUTE_KEY = "lumen-hollow-mute";

export function loadMuted() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

const BPM = 136;
const STEP = 60 / BPM / 2;
const STEPS = 32;
const LEAD = [
  72, 0, 76, 79, 76, 0, 81, 79, 76, 74, 72, 0, 74, 76, 79, 0, 81, 0, 79, 76, 74, 0, 76, 72, 67, 69, 72, 76, 74, 72, 67, 0,
];
const BASS = [
  36, 36, 43, 36, 33, 33, 40, 33, 29, 29, 36, 29, 31, 31, 38, 31, 36, 36, 43, 36, 33, 33, 40, 33, 34, 34, 41, 34, 31, 38, 43, 31,
];

function midi(n: number) {
  return 440 * 2 ** ((n - 69) / 12);
}

function fillTone(buf: AudioBuffer, freq: number, type: OscillatorType, gain: number, slide = 0) {
  const ch = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const n = ch.length;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 14) * (1 - i / n);
    const f = freq + slide * (i / n);
    const ph = (f * t) % 1;
    let s = 0;
    if (type === "square") s = ph < 0.5 ? 1 : -1;
    else if (type === "triangle") s = 4 * Math.abs(ph - 0.5) - 1;
    else if (type === "sawtooth") s = 2 * ph - 1;
    else s = Math.sin(ph * Math.PI * 2);
    ch[i] = s * gain * env;
  }
}

export class JuiceAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private muted = loadMuted();
  private themeOn = false;
  private themeSrc: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private lastLand = 0;

  isMuted() {
    return this.muted;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        this.ctx = new AC({ latencyHint: "interactive" });
      } catch {
        this.ctx = new AC();
      }
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.gain.value = 0.85;
      this.music.gain.value = 0.36;
      this.master.gain.value = this.muted ? 0 : 1;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      const later = () => {
        if (!this.ctx) return;
        this.bake(this.ctx);
        if (this.ctx.state === "running") this.startTheme();
      };
      if (typeof requestIdleCallback === "function") requestIdleCallback(later);
      else setTimeout(later, 0);
    }
    const go = () => {
      if (this.ctx && this.ctx.state === "running") this.startTheme();
    };
    if (this.ctx.state === "suspended") void this.ctx.resume().then(go);
    else go();
  }

  private bake(ctx: AudioContext) {
    const mk = (dur: number, freq: number, type: OscillatorType, gain: number, slide = 0) => {
      const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
      fillTone(buf, freq, type, gain, slide);
      return buf;
    };
    this.buffers.set("jump", mk(0.09, 420, "square", 0.42, 180));
    this.buffers.set("djump", mk(0.1, 560, "square", 0.45, 220));
    this.buffers.set("land", mk(0.06, 90, "triangle", 0.38, -30));
    this.buffers.set("coin", mk(0.1, 980, "sine", 0.4, 240));
    this.buffers.set("check", mk(0.16, 460, "triangle", 0.4, 80));
    this.buffers.set("death", mk(0.22, 180, "sawtooth", 0.4, -120));
    this.buffers.set("win", mk(0.22, 620, "triangle", 0.4, 80));

    const loopDur = STEPS * STEP;
    const theme = ctx.createBuffer(1, Math.floor(ctx.sampleRate * loopDur), ctx.sampleRate);
    const data = theme.getChannelData(0);
    const sr = ctx.sampleRate;
    for (let step = 0; step < STEPS; step++) {
      const t0 = step * STEP;
      const lead = LEAD[step];
      const bass = BASS[step];
      const start = Math.floor(t0 * sr);
      const len = Math.floor(0.18 * sr);
      for (let i = 0; i < len; i++) {
        const idx = start + i;
        if (idx >= data.length) break;
        const t = i / sr;
        const env = Math.exp(-t * 9) * (1 - i / len);
        if (lead) {
          const ph = (midi(lead) * t) % 1;
          data[idx] += (ph < 0.5 ? 1 : -1) * 0.07 * env;
        }
        if (bass) {
          const ph = (midi(bass) * t) % 1;
          data[idx] += (4 * Math.abs(ph - 0.5) - 1) * 0.1 * env;
        }
      }
    }
    this.buffers.set("theme", theme);
  }

  setMuted(next: boolean) {
    this.muted = next;
    try {
      window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(next ? 0 : 1, this.ctx.currentTime, 0.03);
    }
    if (!next) this.unlock();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private startTheme() {
    if (!this.ctx || !this.music || this.themeOn) return;
    const buf = this.buffers.get("theme");
    if (!buf) return;
    this.themeOn = true;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.music);
    src.start();
    this.themeSrc = src;
  }

  pump() {
    /* baked loop — nothing per frame */
  }

  private blast(name: string) {
    if (!this.ctx || !this.sfx) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.sfx);
    src.start();
  }

  jump() {
    this.blast("jump");
  }
  doubleJump() {
    this.blast("djump");
  }
  land() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastLand < 0.12) return;
    this.lastLand = now;
    this.blast("land");
  }
  coin() {
    this.blast("coin");
  }
  checkpoint() {
    this.blast("check");
  }
  death() {
    this.blast("death");
  }
  win() {
    this.blast("win");
  }
  flag() {
    this.blast("win");
  }
}
