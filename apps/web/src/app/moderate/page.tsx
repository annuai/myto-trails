import type { Metadata } from "next";
import Link from "next/link";
import { getSql } from "@/server/db/client";
import { listQueue } from "@/server/moderation/decisions";
import { requireModerator } from "@/server/moderation/session";

export const instant = false;
export const metadata: Metadata = { title: "Moderation", robots: { index: false, follow: false } };

export default async function ModeratePage({ searchParams }: PageProps<"/moderate">) {
  const actor = await requireModerator("/moderate");
  const q = await listQueue(getSql(), actor.id);
  const sp = await searchParams;
  const items = q.ok ? q.items : [];
  return (
    <section className="flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold leading-tight">Moderation</h1>
      <nav aria-label="Moderation sections" className="flex flex-wrap gap-4">
        <Link href="/moderate/reports" className="inline-flex min-h-11 items-center underline underline-offset-4">Reports</Link>
        <Link href="/moderate/comments" className="inline-flex min-h-11 items-center underline underline-offset-4">Comments</Link>
        <Link href="/moderate/due" className="inline-flex min-h-11 items-center underline underline-offset-4">Access checks due</Link>
        {actor.role === "admin" ? <Link href="/moderate/users" className="inline-flex min-h-11 items-center underline underline-offset-4">People</Link> : null}
      </nav>
      {sp.done ? <p role="status" className="border-l-4 border-status-good py-1 pl-4 font-medium">Decision recorded.</p> : null}
      <h2 className="text-xl font-semibold">Waiting for review ({items.length})</h2>
      {items.length === 0 ? <p className="text-muted">Nothing is waiting.</p> : (
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.submissionId} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <Link href={`/moderate/${i.submissionId}`} className="inline-flex min-h-11 items-center underline underline-offset-4">{i.title}</Link>
              <span className="text-sm text-muted">
                {i.state} · {i.accessClass.replaceAll("_", " ")}
                {i.needsSecondApproval ? ` · needs two approvals${i.awaitingSecond ? " (one done)" : ""}` : ""}
                {i.version > 1 ? " · resubmission" : ""} · {new Date(i.submittedAt).toLocaleDateString("en-GB")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
