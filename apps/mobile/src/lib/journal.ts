import type { LatLng } from './geo';

export type JournalMeta = { startedAt: number; source: 'gps' | 'sim' };
export type JournalWaypoint = { name: string; lat: number; lng: number };
export type JournalRide = { meta: JournalMeta; points: LatLng[]; waypoints: JournalWaypoint[] };

/**
 * The on-disk record of the ride being recorded. Every fix is appended the moment it arrives, so a crash,
 * a kill or a locked screen loses nothing. `read` returns null when there is no unfinished ride.
 */
export interface Journal {
  /** Starts a new ride, replacing any previous one. */
  begin(meta: JournalMeta): Promise<void>;
  append(fix: LatLng): Promise<void>;
  appendWaypoint(w: JournalWaypoint): Promise<void>;
  read(): Promise<JournalRide | null>;
  clear(): Promise<void>;
}

/** Keeps the ride in memory only. Used by tests and on the web, where there is no background recording to protect. */
export function createMemoryJournal(): Journal {
  let ride: JournalRide | null = null;
  return {
    begin: async (meta) => { ride = { meta: { ...meta }, points: [], waypoints: [] }; },
    append: async (fix) => { ride?.points.push({ ...fix }); },
    appendWaypoint: async (w) => { ride?.waypoints.push({ ...w }); },
    read: async () => (ride ? { meta: { ...ride.meta }, points: ride.points.map((p) => ({ ...p })), waypoints: ride.waypoints.map((w) => ({ ...w })) } : null),
    clear: async () => { ride = null; },
  };
}
