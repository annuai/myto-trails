/**
 * True while sync is writing pulled changes into the stores. The edit watcher (SyncHost) ignores store changes made then: they are
 * not the rider's edits, and rescanning every item after each one made a pull of 100 items take over a minute.
 */
let depth = 0;
export const isApplying = (): boolean => depth > 0;
export function whileApplying<T>(f: () => T): T {
  depth += 1;
  try { return f(); } finally { depth -= 1; }
}
