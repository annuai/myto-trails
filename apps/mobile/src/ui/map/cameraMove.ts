/**
 * Sends a map camera move and never lets it fail loudly. The camera's commands (flyTo, easeTo, fitBounds, jumpTo) are async native calls:
 * one sent just as the map is torn down (a screen left mid-move, a ride ended) rejects with "Invalid `reactTag` ... could not find MLRNCamera",
 * and a plain try/catch only sees the immediate throw, so that rejection surfaced as an unhandled one (Sentry MYTO-MOBILE-3 and -5).
 * A move that does not land is harmless: the next position or fit moves the camera again.
 */
export function safeMove(move: () => Promise<unknown> | void): void {
  try { Promise.resolve(move()).catch(() => {}); } catch { /* the map is not drawn yet */ }
}
