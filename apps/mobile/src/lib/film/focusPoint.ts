/** How far in from each edge a focus point is kept, as a share of the picture. */
const EDGE = 0.01;

/**
 * Where to focus for a tap at (x, y) on a picture of this size, or nothing if the tap cannot be used. The tap is kept just inside the
 * picture: the camera's native focus takes a point from 0 to 1 and does not check it, and iOS raises an exception outside that range
 * which JavaScript cannot catch, so a tap that lands on an edge (or measured against a different view) closes the whole app.
 */
export function focusPoint(x: number, y: number, box: { width: number; height: number }): { x: number; y: number } | undefined {
  if (!(box.width > 0 && box.height > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  const clamp = (v: number, size: number) => Math.min(size * (1 - EDGE), Math.max(size * EDGE, v));
  return { x: clamp(x, box.width), y: clamp(y, box.height) };
}
