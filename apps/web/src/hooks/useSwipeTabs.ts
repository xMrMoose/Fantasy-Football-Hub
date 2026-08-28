import { useRef, type RefObject, type TouchEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const SWIPE_TABS = ["/", "/matchups", "/playoffs"];
const SWIPE_THRESHOLD_PX = 60;

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

export function useSwipeTabs(containerRef: RefObject<HTMLElement>) {
  const navigate = useNavigate();
  const location = useLocation();
  const start = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: TouchEvent) {
    const container = containerRef.current;
    if (!container || e.touches.length !== 1) {
      start.current = null;
      return;
    }
    if (startsInHorizontalScroller(e.target as Element, container)) {
      start.current = null;
      return;
    }
    const touch = e.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(e: TouchEvent) {
    const s = start.current;
    start.current = null;
    if (!s) return;

    const tabIndex = SWIPE_TABS.indexOf(location.pathname);
    if (tabIndex === -1) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - s.x;
    const dy = touch.clientY - s.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0 && tabIndex < SWIPE_TABS.length - 1) {
      navigate(SWIPE_TABS[tabIndex + 1]);
    } else if (dx > 0 && tabIndex > 0) {
      navigate(SWIPE_TABS[tabIndex - 1]);
    }
  }

  return { onTouchStart, onTouchEnd };
}
