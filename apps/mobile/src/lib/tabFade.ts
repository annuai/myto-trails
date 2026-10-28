/** How far from the end of the page (in points) the tab bar starts to fade away. */
export const FADE_ZONE = 160;
const MOVE = 1;
const TAP_SLOP = 8;

/**
 * Opacity the floating tab bar should have after a scroll step. Scrolling up shows it fully; scrolling down fades it
 * in proportion to how little page is left, so it is gone at the very end and stays gone while the end bounces back;
 * a page too short to need it never fades it.
 */
export function fadeTarget({ y, prevY, maxY, current }: { y: number; prevY: number; maxY: number; current: number }): number {
  if (maxY < FADE_ZONE * 2) return 1;
  const dy = y - prevY;
  // The rubber band settling back from past the end moves the page "up" with no one touching it: that is not the rider scrolling up.
  if (prevY > maxY && y < prevY) return current;
  if (dy < -MOVE) return 1;
  if (dy > MOVE) return Math.min(current, Math.min(1, Math.max(0, (maxY - y) / FADE_ZONE)));
  return current;
}

export function isTap(start: { x: number; y: number }, end: { x: number; y: number }): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) < TAP_SLOP;
}

type TouchLike = { pageX?: number; pageY?: number; changedTouches?: ArrayLike<{ pageX: number; pageY: number }> };

/** Where a touch happened. Browsers report it on `changedTouches`; phones report it there and on the event. */
export function touchPoint(e: TouchLike): { x: number; y: number } {
  const t = e.changedTouches?.[0];
  return { x: t?.pageX ?? e.pageX ?? 0, y: t?.pageY ?? e.pageY ?? 0 };
}
