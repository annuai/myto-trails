export type SwipeTuning = { distance: number; flick: number; flickMin: number; edge: number; edgeMax: number };

/** Where the pane sits for a pull of `dx` points: it follows the finger, except past the first or last pane, where it gives only a little. */
export function swipeOffset(dx: number, index: number, count: number, t: Pick<SwipeTuning, 'edge' | 'edgeMax'>): number {
  const blocked = (dx > 0 && index <= 0) || (dx < 0 && index >= count - 1);
  if (!blocked) return dx;
  return Math.sign(dx) * Math.min(Math.abs(dx) * t.edge, t.edgeMax);
}

/**
 * The pane to show after letting go: the next one for a pull to the left (right to left), the previous one for a pull to the right, when the pull
 * went far enough or was a quick flick; otherwise the same one. Never beyond the first or last.
 */
export function swipeTarget(dx: number, vx: number, width: number, index: number, count: number, t: Omit<SwipeTuning, 'edge' | 'edgeMax'>): number {
  const far = Math.abs(dx) >= width * t.distance;
  const flicked = Math.abs(dx) >= t.flickMin && Math.abs(vx) >= t.flick && Math.sign(vx) === Math.sign(dx);
  if (!far && !flicked) return index;
  return Math.min(Math.max(index + (dx < 0 ? 1 : -1), 0), count - 1);
}

/** Whether a drag that has just started is a sideways swipe rather than the page being scrolled. */
export const isSideways = (dx: number, dy: number, lock: number, ratio: number): boolean => Math.abs(dx) > lock && Math.abs(dx) > Math.abs(dy) * ratio;
