import { isValidSlug } from "@moto-trails/domain";
import type { Sql } from "postgres";
import { diffSnapshot, snapshotOf, type SavedChange, type SavedSnapshot } from "./saved-changes";
import { attachCovers, mapSummary, queryTrailBySlug } from "./trails.sql";
import type { TrailSummaryDto } from "./types";

// Saved trails (the default collection). Every function takes the user id from a verified session and
// filters by it, so one user can never read or change another user's list.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export type SavedItem = {
  trail: TrailSummaryDto | null;
  addedAt: string;
  changes: SavedChange[];
  /** Set only when the trail is no longer published: lets the rider remove it without learning anything about it. */
  unavailableId?: string;
};

async function defaultCollectionId(sql: Sql, userId: string): Promise<string> {
  await sql`insert into collection (user_id, name, is_default) values (${userId}, 'Saved', true) on conflict (user_id) where is_default do nothing`;
  const [row] = await sql`select id from collection where user_id = ${userId} and is_default`;
  return row!.id as string;
}

export async function saveTrail(sql: Sql, userId: string, slug: string, now: Date): Promise<{ saved: true } | { saved: false; reason: "not_found" }> {
  if (!isValidSlug(slug)) return { saved: false, reason: "not_found" };
  const trail = await queryTrailBySlug(sql, slug, now);
  if (!trail) return { saved: false, reason: "not_found" };
  const collectionId = await defaultCollectionId(sql, userId);
  await sql`
    insert into collection_item (collection_id, trail_id, last_seen_state)
    values (${collectionId}, ${trail.id}, ${sql.json(snapshotOf(trail))})
    on conflict (collection_id, trail_id) do nothing`;
  return { saved: true };
}

export async function unsaveTrail(sql: Sql, userId: string, slug: string): Promise<void> {
  if (!isValidSlug(slug)) return;
  await sql`
    delete from collection_item ci using collection c, trail t
    where ci.collection_id = c.id and c.user_id = ${userId} and ci.trail_id = t.id and t.slug = ${slug}`;
}

export async function unsaveTrailById(sql: Sql, userId: string, trailId: string): Promise<void> {
  await sql`
    delete from collection_item ci using collection c
    where ci.collection_id = c.id and c.user_id = ${userId} and ci.trail_id = ${trailId}`;
}

export async function isSaved(sql: Sql, userId: string, slug: string): Promise<boolean> {
  if (!isValidSlug(slug)) return false;
  const rows = await sql`
    select 1 from collection_item ci join collection c on c.id = ci.collection_id join trail t on t.id = ci.trail_id
    where c.user_id = ${userId} and t.slug = ${slug}`;
  return rows.length > 0;
}

export async function listSaved(sql: Sql, userId: string, now: Date): Promise<SavedItem[]> {
  const items = (await sql`
    select ci.trail_id, ci.added_at, ci.last_seen_state
    from collection_item ci join collection c on c.id = ci.collection_id
    where c.user_id = ${userId}
    order by ci.added_at desc`) as Row[];
  if (items.length === 0) return [];
  const rows = (await sql`select * from public_trails where id = any(${items.map((i) => i.trail_id)}::uuid[])`) as Row[];
  const byId = new Map((await attachCovers(sql, rows.map((r) => mapSummary(r, now)))).map((t) => [t.id, t]));

  const result: SavedItem[] = items.map((i) => {
    const trail = byId.get(i.trail_id) ?? null;
    if (!trail) return { trail: null, addedAt: new Date(i.added_at).toISOString(), changes: [], unavailableId: i.trail_id as string };
    return {
      trail,
      addedAt: new Date(i.added_at).toISOString(),
      changes: diffSnapshot(i.last_seen_state as SavedSnapshot, snapshotOf(trail)),
    };
  });
  // Changed trails first; otherwise newest saved first (the query order, which a stable sort keeps).
  return result.sort((a, b) => Number(b.changes.length > 0) - Number(a.changes.length > 0));
}

/** Records that the rider has now seen the trail's current state. */
export async function markSavedSeen(sql: Sql, userId: string, slug: string, now: Date): Promise<void> {
  if (!isValidSlug(slug)) return;
  const trail = await queryTrailBySlug(sql, slug, now);
  if (!trail) return;
  await sql`
    update collection_item ci set last_seen_state = ${sql.json(snapshotOf(trail))}
    from collection c
    where ci.collection_id = c.id and c.user_id = ${userId} and ci.trail_id = ${trail.id}`;
}
