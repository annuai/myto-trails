import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSql } from "@/server/db/client";
import { listDueForRecheck, listNeedingRide } from "@/server/moderation/access";
import { requireModerator } from "@/server/moderation/session";

export const instant = false;
export const metadata: Metadata = { title: "Access checks due", robots: { index: false, follow: false } };

export default async function DuePage() {
  const actor = await requireModerator("/moderate/due");
  await connection();
  const r = await listDueForRecheck(getSql(), actor.id, new Date());
  const items = r.ok ? r.items : [];
  const ride = await listNeedingRide(getSql(), actor.id, new Date());
  const toRide = ride.ok ? ride.items : [];
  return (
    <section className="flex max-w-3xl flex-col gap-6 py-8">
      <Link href="/moderate" className="text-sm underline underline-offset-4">Back to the queue</Link>
      <h1 className="text-3xl font-semibold leading-tight">Access checks due</h1>
      <p className="text-muted">Verified access that expires within 30 days or has already lapsed. Riders see lapsed verification as &quot;needs re-check&quot;.</p>
      {items.length === 0 ? <p>Nothing is due.</p> : (
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.slug} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <Link href={`/moderate/trails/${i.slug}`} className="inline-flex min-h-11 items-center underline underline-offset-4">{i.name}</Link>
              <span className="text-sm">{i.overdue ? "Lapsed" : "Expires"} {i.validUntil}</span>
            </li>
          ))}
        </ul>
      )}
      <h2 className="text-2xl font-semibold leading-tight">Trails to ride and check</h2>
      <p className="text-muted">Published trails nobody has verified, with no moderator check in the last 60 days. Ride one, then set its condition on the trail page with a note of what you saw; that counts as a check.</p>
      {toRide.length === 0 ? <p>Nothing to ride.</p> : (
        <ul className="flex flex-col gap-3">
          {toRide.map((i) => (
            <li key={i.slug} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <Link href={`/moderate/trails/${i.slug}`} className="inline-flex min-h-11 items-center underline underline-offset-4">{i.name}</Link>
              <span className="text-sm">{i.daysSince === null ? "Never checked" : `Checked ${i.daysSince} days ago`}{i.riderReports ? ` · ${i.riderReports} rider reports this month` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
