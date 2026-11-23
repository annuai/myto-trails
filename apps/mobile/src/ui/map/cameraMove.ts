/**
 * Sends a map camera move and never lets it fail loudly. The camera's commands (flyTo, easeTo, fitBounds, jumpTo) are async native calls:
 * one sent just as the map is torn down (a screen left mid-move, a ride ended) rejects with "Invalid `reactTag` ... could not find MLRNCamera",
 * and a plain try/catch only sees the immediate throw, so that rejection surfaced as an unhandled one (Sentry MYTO-MOBILE-3 and -5).
 * A move that does not land is harmless: the next position or fit moves the camera again.
 */
export function safeMove(move: () => Promise<unknown> | void): void {
  try { Promise.resolve(move()).catch(() => {}); } catch { /* the map is not drawn yet */ }
}

/**
 * Whether the heading arrow is the fixed screen-centre overlay (true) or a marker on the map (false). It is fixed only while the camera follows AND is
 * not mid-flight back to the rider: tapping "centre on me" sets following at once, but the camera needs RECENTER_MS to arrive, so a fixed arrow would
 * jump to the middle of the screen while the rider's real spot was still gliding there. Until the flight lands it stays a marker, which moves with the map.
 */
export function arrowIsFixed(arrow: boolean, follow: boolean, following: boolean, recentering: boolean): boolean {
  return arrow && follow && following && !recentering;
}
