import { useEffect, type RefObject } from "react";

const NEXT = new Set(["ArrowDown", "ArrowRight", "KeyS", "KeyD"]);
const PREV = new Set(["ArrowUp", "ArrowLeft", "KeyW", "KeyA"]);
const ACT = new Set(["Space", "Enter"]);

function items(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>("[data-nav]")].filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if ((el as HTMLButtonElement).disabled) return false;
    return true;
  });
}

export function useMenuNav(active: boolean, rootRef: RefObject<HTMLElement | null>, screen = "") {
  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    if (!root) return;

    const focusAt = (index: number) => {
      const list = items(root);
      if (!list.length) return;
      const n = ((index % list.length) + list.length) % list.length;
      list[n].focus();
    };

    let frames = 0;
    let raf = 0;
    const arm = () => {
      frames += 1;
      const list = items(root);
      if (list.length) {
        const cur = list.findIndex((el) => el === document.activeElement);
        focusAt(cur >= 0 ? cur : 0);
        return;
      }
      if (frames < 8) raf = window.requestAnimationFrame(arm);
    };
    raf = window.requestAnimationFrame(arm);

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const t = e.target;
      const typing = t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const list = items(root);
      if (!list.length) return;
      let i = list.findIndex((el) => el === document.activeElement);
      if (i < 0) i = 0;

      if (typing) {
        if (e.code === "ArrowDown") {
          e.preventDefault();
          focusAt(i + 1);
        } else if (e.code === "ArrowUp") {
          e.preventDefault();
          focusAt(i - 1);
        }
        return;
      }

      if (NEXT.has(e.code)) {
        e.preventDefault();
        focusAt(i + 1);
      } else if (PREV.has(e.code)) {
        e.preventDefault();
        focusAt(i - 1);
      } else if (ACT.has(e.code)) {
        e.preventDefault();
        list[i]?.click();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, rootRef, screen]);
}
