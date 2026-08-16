let time = 0;
let label = "0:00.00";
const listeners = new Set<(t: number, text: string) => void>();

function fmt(seconds: number) {
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function pushHudTime(t: number) {
  const next = fmt(t);
  if (next === label && t === time) return;
  time = t;
  label = next;
  for (const fn of listeners) fn(t, next);
}

export function getHudTime() {
  return time;
}

export function onHudTime(fn: (t: number, text: string) => void) {
  listeners.add(fn);
  fn(time, label);
  return () => {
    listeners.delete(fn);
  };
}
