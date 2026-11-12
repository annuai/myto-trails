import type { Sql } from "postgres";
import { decideEvent, validateEntitlement, type BillingEvent, type EntitlementKind, type EntitlementStatus, type Invalid } from "./decide";

export type { BillingEvent } from "./decide";
type Fail<R extends string> = { ok: false; reason: R };

async function rideLeader(sql: Sql, rideId: string | null | undefined): Promise<string | null> {
  if (!rideId) return null;
  const [r] = await sql`select leader_id from group_ride where id = ${rideId}`;
  return (r?.leader_id as string | undefined) ?? null;
}

/** Give something for free (founding clubs, support). A pass needs a ride the user leads; Organiser needs an end date. */
export async function grantEntitlement(
  sql: Sql,
  i: { userId: string; kind: EntitlementKind; rideId?: string | null; endsAt?: Date | null; now: Date },
): Promise<{ ok: true; id: string } | Fail<Invalid>> {
  const rideId = i.kind === "large_ride_pass" ? i.rideId ?? null : null;
  const bad = validateEntitlement({ ...i, rideId, leaderId: await rideLeader(sql, rideId), requireFutureEnd: true });
  if (bad) return { ok: false, reason: bad };
  const [row] = await sql`
    insert into entitlement (user_id, kind, ride_id, status, source, starts_at, ends_at)
    values (${i.userId}, ${i.kind}, ${rideId}, 'active', 'grant', ${i.now}, ${i.endsAt ?? null}) returning id`;
  return { ok: true, id: row!.id as string };
}

/** Take back an active entitlement. Returns false if there was nothing active with that id. */
export async function revokeEntitlement(sql: Sql, id: string): Promise<boolean> {
  const rows = await sql`update entitlement set status = 'cancelled' where id = ${id} and status = 'active' returning id`;
  return rows.length > 0;
}

/**
 * Apply one billing event, safely to repeat: the same (provider, providerRef) is one row however many times it arrives.
 * Transitions come from decideEvent. A new purchase is checked like a grant (ride led by the buyer, Organiser has an end date).
 */
export async function applyBillingEvent(sql: Sql, e: BillingEvent, now: Date = new Date()): Promise<{ ok: true; outcome: "inserted" | "updated" | "unchanged" } | Fail<Invalid>> {
  if (!e.provider || !e.providerRef) return { ok: false, reason: "bad_event" };
  const rideId = e.kind === "large_ride_pass" ? e.rideId ?? null : null;
  return sql.begin(async (tx) => {
    const [cur] = await tx`select id, status from entitlement where provider = ${e.provider} and provider_ref = ${e.providerRef} for update`;
    const d = decideEvent((cur?.status as EntitlementStatus | undefined) ?? null, e.type);
    if (d.action === "noop") return { ok: true, outcome: "unchanged" } as const;
    if (d.action === "update") {
      await tx`update entitlement set status = ${d.status} where id = ${cur!.id}`;
      return { ok: true, outcome: "updated" } as const;
    }
    // Only a payment has to be valid to be recorded; a failure or refund for a purchase we never saw is kept so a later 'paid' stays dead.
    const bad = validateEntitlement({ userId: e.userId, kind: e.kind, rideId, leaderId: await rideLeader(tx as unknown as Sql, rideId), endsAt: e.endsAt, now, requireFutureEnd: false });
    if (bad && (e.type === "paid" || bad === "invalid_kind" || bad === "needs_ride")) return { ok: false, reason: bad } as const;
    const inserted = await tx`
      insert into entitlement (user_id, kind, ride_id, status, source, provider, provider_ref, starts_at, ends_at)
      values (${e.userId}, ${e.kind}, ${rideId}, ${d.status}, 'purchase', ${e.provider}, ${e.providerRef}, ${now}, ${e.endsAt ?? null})
      on conflict (provider, provider_ref) do nothing returning id`;
    return { ok: true, outcome: inserted.length ? "inserted" : "unchanged" } as const;
  });
}
