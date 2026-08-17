import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Input } from "@/game/input";
import { cn } from "@/lib/utils";

const TOUCH_PRIMARY = "(hover: none) and (pointer: coarse)";

export function useTouchPrimary() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(TOUCH_PRIMARY);
    const apply = () => setOn(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return on;
}

export function TouchControls({
  active,
  input,
}: {
  active: boolean;
  input: () => Input | undefined;
}) {
  const phone = useTouchPrimary();
  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    if (phone && active) return;
    inputRef.current()?.setTouch({ left: false, right: false, jump: false });
  }, [phone, active]);

  if (!phone || !active) return null;

  const set = (partial: { left?: boolean; right?: boolean; jump?: boolean }) => {
    input()?.setTouch(partial);
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between"
      style={{
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
        paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex gap-3">
        <Pad aria="Move left" name="left" onHeld={(held) => set({ left: held })}>
          <ChevronLeft className="size-8" strokeWidth={2.25} />
        </Pad>
        <Pad aria="Move right" name="right" onHeld={(held) => set({ right: held })}>
          <ChevronRight className="size-8" strokeWidth={2.25} />
        </Pad>
      </div>
      <Pad aria="Jump" name="jump" round onHeld={(held) => set({ jump: held })}>
        <span className="text-sm font-semibold tracking-wide">Jump</span>
      </Pad>
    </div>
  );
}

function Pad({
  aria,
  name,
  round,
  onHeld,
  children,
}: {
  aria: string;
  name: "left" | "right" | "jump";
  round?: boolean;
  onHeld: (held: boolean) => void;
  children: ReactNode;
}) {
  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* older WebKit */
    }
    onHeld(true);
  };
  const up = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onHeld(false);
  };

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={aria}
      data-touch-pad={name}
      className={cn(
        "pointer-events-auto flex touch-none select-none items-center justify-center border border-border/80 bg-bg/50 text-fg outline-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [-webkit-user-select:none]",
        round ? "size-[5.25rem] rounded-full" : "size-[4.5rem] rounded-2xl",
      )}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={() => onHeld(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
