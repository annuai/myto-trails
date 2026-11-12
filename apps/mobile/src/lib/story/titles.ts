/** Rider titles: earned by riding, never a label for someone new. There is no rung below Day-tripper; zero rides has no title. */
export type TitleId = 'day-tripper' | 'trail-regular' | 'ghat-rider' | 'long-hauler' | 'road-veteran';

/** Order defines the rung (1-based). */
export const TITLES: readonly { id: TitleId; name: string; rung: number; hint: string }[] = [
  { id: 'day-tripper', name: 'Day-tripper', rung: 1, hint: 'Finish a ride' },
  { id: 'trail-regular', name: 'Trail regular', rung: 2, hint: '5 rides across 3 months' },
  { id: 'ghat-rider', name: 'Ghat rider', rung: 3, hint: '15 rides across 6 months, 5 trails' },
  { id: 'long-hauler', name: 'Long hauler', rung: 4, hint: '30 rides across 9 months, 10 trails' },
  { id: 'road-veteran', name: 'Road veteran', rung: 5, hint: '80 rides across 18 months, 20 trails' },
];

export type TitleStats = { rides: number; monthsRidden: number; trailsRidden?: number };

const NEEDS: Record<TitleId, { rides: number; months: number; trails: number }> = {
  'day-tripper': { rides: 1, months: 0, trails: 0 },
  'trail-regular': { rides: 5, months: 3, trails: 0 },
  'ghat-rider': { rides: 15, months: 6, trails: 5 },
  'long-hauler': { rides: 30, months: 9, trails: 10 },
  'road-veteran': { rides: 80, months: 18, trails: 20 },
};

/** Highest title whose every threshold holds, or null with no rides. */
export function titleFor(s: TitleStats): TitleId | null {
  const trails = s.trailsRidden ?? 0;
  let best: TitleId | null = null;
  for (const t of TITLES) {
    const n = NEEDS[t.id];
    if (s.rides >= n.rides && s.monthsRidden >= n.months && trails >= n.trails) best = t.id;
  }
  return best;
}

/** Distinct local calendar months with a real ride; sample rides are ignored. */
export function monthsRidden(rides: readonly { startedAt: number; sample?: boolean }[]): number {
  const seen = new Set<string>();
  for (const r of rides) {
    if (r.sample) continue;
    const d = new Date(r.startedAt);
    seen.add(`${d.getFullYear()}-${d.getMonth()}`);
  }
  return seen.size;
}

const rungOf = (id: TitleId | null): number => (id ? TITLES.findIndex((t) => t.id === id) + 1 : 0);

/** The higher of two titles, so a title once shown is never lost. */
export function higherTitle(a: TitleId | null, b: TitleId | null): TitleId | null {
  return rungOf(b) > rungOf(a) ? b : a;
}
