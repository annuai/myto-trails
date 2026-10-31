const DAY_MS = 86_400_000;

type R = { id: string; startedAt: number; durationSec: number; pausedSec?: number; sample?: boolean };

/** The newest real ride, if it ended in the last day: Dash offers its story for that long. The seeded sample ride never counts. */
export function justFinishedRide<T extends R>(rides: T[], now: number): T | undefined {
  const r = rides.find((x) => !x.sample);
  return r && now - (r.startedAt + (r.durationSec + (r.pausedSec ?? 0)) * 1000) < DAY_MS ? r : undefined;
}
