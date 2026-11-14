/** Newest ride first. Stable: rides that started at the same moment keep the order they had. */
export function newestFirst<T extends { startedAt: number }>(rides: T[]): T[] {
  return rides.map((r, i) => [r, i] as const).sort(([a, i], [b, j]) => b.startedAt - a.startedAt || i - j).map(([r]) => r);
}
