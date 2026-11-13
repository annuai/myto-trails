/** What syncs between a rider's phones, and the rules both the server and the phone apply. See docs/sync-design.md. */
export const SYNC_KINDS = ["ride", "trip", "todo", "moment"] as const;
export type SyncKind = (typeof SYNC_KINDS)[number];

export const SYNC_LIMITS = {
  /** Changes in one push. The API's 64 KB body cap is the tighter limit for rides with many waypoints. */
  maxChanges: 200,
  /** One record's `data`, serialised. A ride's points are not in it: they travel as a track object. */
  maxRecordBytes: 16 * 1024,
  /** One compressed track. A 3-hour ride at 1 point a second is about 130 KB. */
  maxTrackBytes: 400 * 1024,
  /** Per rider, rides that are not deleted. */
  maxRides: 100,
  /** Per rider, all track objects together. */
  maxTrackTotalBytes: 50 * 1024 * 1024,
  /** Soft-deleted rows stay this long so a delete on one phone cannot come back from another. */
  tombstoneDays: 30,
} as const;

export type SyncStored = { updatedAt: number; originDevice: string; deleted: boolean };
export type SyncIncoming = { updatedAt: number; deviceId: string; baseUpdatedAt: number | null; deleted: boolean };
/**
 * insert: nothing stored yet. overwrite: the newer edit wins. stale: the stored copy is newer (or the same); the phone should pull.
 * fork: a ride changed on two phones from the same starting point; keep both (the second becomes "(other phone)").
 */
export type SyncDecision = "insert" | "overwrite" | "stale" | "fork";

export function decideSync(kind: SyncKind, stored: SyncStored | null, incoming: SyncIncoming): SyncDecision {
  if (!stored) return "insert";
  // The same phone writing again (a retry, or a later edit of its own record) only ever moves forward.
  if (stored.originDevice === incoming.deviceId) return incoming.updatedAt >= stored.updatedAt ? "overwrite" : "stale";
  // Another phone saw the stored version before editing: an ordinary newer edit.
  if (incoming.baseUpdatedAt === stored.updatedAt) return "overwrite";
  // Another phone edited a different version than the one stored. A finished ride is a record of something that happened,
  // so it is never silently overwritten; a deletion still wins on a ride only when it is newer.
  if (kind === "ride" && !incoming.deleted && !stored.deleted) return "fork";
  return incoming.updatedAt > stored.updatedAt ? "overwrite" : "stale";
}

const ID = /^[A-Za-z0-9._~-]{1,80}$/;
export const isSyncId = (v: unknown): v is string => typeof v === "string" && ID.test(v);
export const isSyncKind = (v: unknown): v is SyncKind => typeof v === "string" && (SYNC_KINDS as readonly string[]).includes(v);

/** The id of the second copy of a ride kept after a two-phone edit. Stable, so a retried push does not create a third. */
export const forkId = (id: string, deviceId: string): string => `${id.slice(0, 60)}~${deviceId.replace(/[^A-Za-z0-9]/g, "").slice(0, 12)}`;
