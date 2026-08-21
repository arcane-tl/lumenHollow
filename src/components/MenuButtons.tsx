import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTouchPrimary } from "@/components/TouchControls";
import { cn } from "@/lib/utils";

const NEXT = new Set(["ArrowDown", "ArrowRight", "KeyS", "KeyD"]);
const PREV = new Set(["ArrowUp", "ArrowLeft", "KeyW", "KeyA"]);
const ROW_NEXT = new Set(["ArrowRight", "KeyD"]);
const ROW_PREV = new Set(["ArrowLeft", "KeyA"]);
const COL_NEXT = new Set(["ArrowDown", "KeyS"]);
const COL_PREV = new Set(["ArrowUp", "KeyW"]);

export interface MenuAction {
  id: string;
  label: ReactNode;
  onPick: () => void;
  confirm?: () => void;
  variant?: "default" | "outline" | "ghost";
}

export function MenuButtons({
  items,
  align = "center",
  onActive,
  className,
  onCancel,
  lead = 0,
  aside,
}: {
  items: MenuAction[];
  align?: "center" | "start";
  onActive?: (id: string, index: number) => void;
  className?: string;
  onCancel?: () => void;
  lead?: number;
  aside?: ReactNode;
}) {
  const compact = useTouchPrimary();
  const leadN = Math.max(0, Math.min(lead, items.length));
  const [i, setI] = useState(0);
  const iRef = useRef(0);
  const leadRef = useRef(leadN);
  const lastLeadRef = useRef(0);
  const itemsRef = useRef(items);
  const onActiveRef = useRef(onActive);
  const onCancelRef = useRef(onCancel);
  const hoverOk = useRef(false);
  const keysOk = useRef(false);
  iRef.current = i;
  leadRef.current = leadN;
  itemsRef.current = items;
  onActiveRef.current = onActive;
  onCancelRef.current = onCancel;
  const ids = items.map((it) => it.id).join("|");

  useEffect(() => {
    const list = itemsRef.current;
    const start = Math.max(0, list.findIndex((it) => it.variant === "default"));
    setI(start);
    iRef.current = start;
    if (leadRef.current > 0 && start < leadRef.current) lastLeadRef.current = start;
    hoverOk.current = false;
    keysOk.current = false;
    const first = list[start];
    if (first) onActiveRef.current?.(first.id, start);
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
      const go = (n: number) => {
        const max = list.length;
        const idx = ((n % max) + max) % max;
        iRef.current = idx;
        const leadN = leadRef.current;
        if (leadN > 0 && idx < leadN) lastLeadRef.current = idx;
        setI(idx);
      };
      if (leadRef.current > 0) {
        const leadN = leadRef.current;
        const cur = iRef.current;
        if (ROW_NEXT.has(e.code) || ROW_PREV.has(e.code) || COL_NEXT.has(e.code) || COL_PREV.has(e.code)) {
          if (!keysOk.current) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }
          e.preventDefault();
          e.stopImmediatePropagation();
          if (cur < leadN) {
            if (ROW_NEXT.has(e.code)) go(Math.min(leadN - 1, cur + 1));
            else if (ROW_PREV.has(e.code)) go(Math.max(0, cur - 1));
            else if (COL_NEXT.has(e.code)) go(leadN);
            else go(list.length - 1);
            return;
          }
          if (COL_NEXT.has(e.code) || ROW_NEXT.has(e.code)) go(cur + 1);
          else if (cur > leadN) go(cur - 1);
          else go(lastLeadRef.current);
          return;
        }
      } else if (NEXT.has(e.code)) {
        if (!keysOk.current) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        go(iRef.current + 1);
        return;
      } else if (PREV.has(e.code)) {
        if (!keysOk.current) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        go(iRef.current - 1);
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
        const it = list[iRef.current];
        (it?.confirm ?? it?.onPick)?.();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const renderBtn = (it: MenuAction, idx: number) => (
    <Button
      key={it.id}
      type="button"
      variant={idx === i ? "default" : it.variant ?? "outline"}
      data-current={idx === i ? "1" : "0"}
      className={cn(
        idx === i && "ring-2 ring-accent",
        align === "start" && "justify-start px-5",
        compact && "h-9 px-3 text-sm",
        compact && align === "start" && "px-3",
      )}
      onClick={() => {
        iRef.current = idx;
        if (leadN > 0 && idx < leadN) lastLeadRef.current = idx;
        setI(idx);
        it.onPick();
      }}
      onMouseEnter={() => {
        if (!hoverOk.current) return;
        iRef.current = idx;
        if (leadN > 0 && idx < leadN) lastLeadRef.current = idx;
        setI(idx);
      }}
    >
      {it.label}
    </Button>
  );

  return (
    <div
      className={cn("mt-5", compact && "mt-3", className)}
      data-menu=""
      data-menu-index={i}
    >
      {leadN > 0 && (
        <div className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
          {items.slice(0, leadN).map((it, idx) => renderBtn(it, idx))}
        </div>
      )}
      <div
        className={cn(
          "flex flex-col gap-2",
          compact && "gap-1.5",
          leadN > 0 && (compact ? "mt-3" : "mt-4"),
          aside && "md:grid md:grid-cols-[minmax(13rem,17rem)_minmax(16rem,26rem)] md:items-start md:gap-4",
          aside && compact && "md:gap-3",
        )}
      >
        <div className={cn("flex flex-col gap-2", compact && "gap-1.5")}>
          {items.slice(leadN).map((it, j) => renderBtn(it, j + leadN))}
        </div>
        {aside}
      </div>
    </div>
  );
}
