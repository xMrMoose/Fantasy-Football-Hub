import { useEffect, useRef, type RefObject, type TouchEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const SWIPE_TABS = ["/", "/matchups", "/playoffs"];
const COMMIT_THRESHOLD_PX = 60;
const RESISTANCE = 3; // divisor applied when dragging past the first/last tab
const TRANSITION_MS = 150;

// Don't hijack the gesture if it starts inside an element that itself
// scrolls horizontally (e.g. the playoff bracket columns, wide tables) —
// let that element's native scroll handle it instead.
function startsInHorizontalScroller(target: Element | null, root: Element): boolean {
  let node: Element | null = target;
  while (node && node !== root) {
    if (node.scrollWidth > node.clientWidth + 1) return true;
    node = node.parentElement;
  }
  return false;
}

interface DragState {
  startX: number;
  startY: number;
  width: number;
  /** null until enough movement has happened to tell a swipe from a vertical scroll. */
  locked: "horizontal" | "vertical" | null;
  lastDx: number;
}

/**
 * Drives both the swipe gesture and the tab-change animation.
 *
 * The panel is moved by direct style mutation (not React state) so it
 * tracks the finger at full frame rate. On a committed swipe, the outgoing
 * page is snapped fully off-screen instantly (no transition — it's about to
 * be replaced, so animating its exit only adds a second, disconnected-feeling
 * phase), then once the route swap has actually landed in the DOM the new
 * page is snapped to the opposite edge and slid to rest in one continuous
 * transition. That single-phase handoff is what makes it read as one fluid
 * swipe instead of "exit, pause, enter."
 */
export function useSwipeTabs(containerRef: RefObject<HTMLElement>, panelRef: RefObject<HTMLElement>) {
  const navigate = useNavigate();
  const location = useLocation();
  const drag = useRef<DragState | null>(null);
  const animating = useRef(false);
  const pendingEnter = useRef<{ dir: number; width: number } | null>(null);

  function setTransform(px: number, withTransition: boolean) {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transition = withTransition ? `transform ${TRANSITION_MS}ms ease-out` : "none";
    panel.style.transform = px === 0 ? "" : `translateX(${px}px)`;
  }

  function settle(target: number, onDone?: () => void) {
    const panel = panelRef.current;
    setTransform(target, true);
    if (!panel) {
      onDone?.();
      return;
    }
    const handle = () => {
      panel.removeEventListener("transitionend", handle);
      onDone?.();
    };
    panel.addEventListener("transitionend", handle);
    // Fallback in case transitionend never fires (e.g. target === current position).
    window.setTimeout(handle, TRANSITION_MS + 60);
  }

  // Fires once the route we navigated to on a committed swipe has actually
  // rendered — only then is it safe to position the new page and slide it in.
  useEffect(() => {
    const pending = pendingEnter.current;
    if (!pending) return;
    pendingEnter.current = null;
    setTransform(-pending.dir * pending.width, false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        settle(0, () => {
          animating.current = false;
        });
      });
    });
  }, [location.pathname]);

  function onTouchStart(e: TouchEvent) {
    const container = containerRef.current;
    if (!container || animating.current || e.touches.length !== 1) {
      drag.current = null;
      return;
    }
    if (startsInHorizontalScroller(e.target as Element, container)) {
      drag.current = null;
      return;
    }
    const touch = e.touches[0];
    drag.current = { startX: touch.clientX, startY: touch.clientY, width: container.clientWidth, locked: null, lastDx: 0 };
  }

  function onTouchMove(e: TouchEvent) {
    const d = drag.current;
    if (!d || d.locked === "vertical") return;
    const touch = e.touches[0];
    const dx = touch.clientX - d.startX;
    const dy = touch.clientY - d.startY;

    if (d.locked === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      d.locked = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      if (d.locked === "vertical") return; // let the page scroll natively instead
    }

    const tabIndex = SWIPE_TABS.indexOf(location.pathname);
    let adjusted = dx;
    if (tabIndex === -1) adjusted = 0;
    else if (dx > 0 && tabIndex === 0) adjusted = dx / RESISTANCE;
    else if (dx < 0 && tabIndex === SWIPE_TABS.length - 1) adjusted = dx / RESISTANCE;

    d.lastDx = adjusted;
    setTransform(adjusted, false);
  }

  function onTouchEnd() {
    const d = drag.current;
    drag.current = null;
    if (!d || d.locked !== "horizontal") return;

    const tabIndex = SWIPE_TABS.indexOf(location.pathname);
    const dx = d.lastDx;
    const dir = dx < 0 ? -1 : 1; // -1 = advancing to the next tab, +1 = back to the previous
    const commit =
      tabIndex !== -1 &&
      Math.abs(dx) >= COMMIT_THRESHOLD_PX &&
      ((dir < 0 && tabIndex < SWIPE_TABS.length - 1) || (dir > 0 && tabIndex > 0));

    if (!commit) {
      settle(0);
      return;
    }

    animating.current = true;
    setTransform(dir * d.width, false); // snap the outgoing page fully off-screen, instantly
    pendingEnter.current = { dir, width: d.width };
    navigate(SWIPE_TABS[tabIndex + (dir < 0 ? 1 : -1)]);
  }

  function onTouchCancel() {
    const d = drag.current;
    drag.current = null;
    if (d && d.locked === "horizontal") settle(0);
  }

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
