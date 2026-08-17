import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTouchPrimary } from "@/components/TouchControls";
import { cn } from "@/lib/utils";

const NEXT = new Set(["ArrowDown", "ArrowRight", "KeyS", "KeyD"]);
const PREV = new Set(["ArrowUp", "ArrowLeft", "KeyW", "KeyA"]);

export interface MenuAction {
  id: string;
  label: ReactNode;
  onPick: () => void;
  variant?: "default" | "outline" | "ghost";
}

export function MenuButtons({
  items,
  align = "center",
  onActive,
  className,
  onCancel,
}: {
  items: MenuAction[];
  align?: "center" | "start";
  onActive?: (id: string, index: number) => void;
  className?: string;
  onCancel?: () => void;
}) {
  const compact = useTouchPrimary();
  const [i, setI] = useState(0);
  const iRef = useRef(0);
  const itemsRef = useRef(items);
  const onActiveRef = useRef(onActive);
  const onCancelRef = useRef(onCancel);
  const hoverOk = useRef(false);
  const keysOk = useRef(false);
  iRef.current = i;
  itemsRef.current = items;
  onActiveRef.current = onActive;
  onCancelRef.current = onCancel;
  const ids = items.map((it) => it.id).join("|");

  useEffect(() => {
    setI(0);
    iRef.current = 0;
    hoverOk.current = false;
    keysOk.current = false;
    const first = itemsRef.current[0];
    if (first) onActiveRef.current?.(first.id, 0);
    const onMove = () => {
      hoverOk.current = true;
    };
    const armKeys = () => {
      keysOk.current = true;
    };
    const wait = window.setTimeout(armKeys, 200);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keyup", armKeys);
    return () => {
      window.clearTimeout(wait);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keyup", armKeys);
    };
  }, [ids]);

  useEffect(() => {
    const current = itemsRef.current[i];
    if (current) onActiveRef.current?.(current.id, i);
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const list = itemsRef.current;
      if (!list.length) return;
      if (NEXT.has(e.code)) {
        if (!keysOk.current) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        const n = (iRef.current + 1) % list.length;
        iRef.current = n;
        setI(n);
        return;
      }
      if (PREV.has(e.code)) {
        if (!keysOk.current) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        const n = (iRef.current - 1 + list.length) % list.length;
        iRef.current = n;
        setI(n);
        return;
      }
      if (e.code === "Escape") {
        if (!onCancelRef.current) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        onCancelRef.current();
        return;
      }
      if (e.code === "Space" || e.code === "Enter") {
        if (!keysOk.current) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        list[iRef.current]?.onPick();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div
      className={cn("mt-5 flex flex-col gap-2", compact && "mt-3 gap-1.5", className)}
      data-menu=""
      data-menu-index={i}
    >
      {items.map((it, idx) => (
        <Button
          key={it.id}
          type="button"
          variant={idx === i ? "default" : "outline"}
          data-current={idx === i ? "1" : "0"}
          className={cn(
            idx === i && "ring-2 ring-accent",
            align === "start" && "justify-start px-5",
            compact && "h-9 px-3 text-sm",
            compact && align === "start" && "px-3",
          )}
          onClick={it.onPick}
          onMouseEnter={() => {
            if (!hoverOk.current) return;
            iRef.current = idx;
            setI(idx);
          }}
        >
          {it.label}
        </Button>
      ))}
    </div>
  );
}
