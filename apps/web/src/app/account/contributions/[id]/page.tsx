import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { statusLabel } from "@/features/submit/status";
import { requireUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { getMine } from "@/server/submissions/service";

export const instant = false;
export const metadata: Metadata = { title: "Contribution", robots: { index: false, follow: false } };

export default async function ContributionPage({ params, searchParams }: PageProps<"/account/contributions/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/account/contributions/${id}`);
  const s = await getMine(getSql(), user.id, id);
  if (!s) notFound();
  const sp = await searchParams;

  return (
    <section className="flex max-w-prose flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold leading-tight">{s.title ?? "Untitled draft"}</h1>
      <p><span className="text-sm text-muted">Status</span><br /><span className="font-medium">{statusLabel(s.status)}</span></p>
      {sp.sent ? (
        <div role="status" className="border-l-4 border-status-good py-1 pl-4">
          <p className="font-medium">Thank you. Your trail was sent for review.</p>
          <p className="mt-1">A moderator will check the details and, above all, the access information. You can follow progress here. Reviews usually take a few days.</p>
        </div>
      ) : null}
      {s.status === "changes_requested" ? (
        <div role="status" className="border-l-4 border-status-caution py-1 pl-4">
          <p className="font-medium">A moderator asked for changes</p>
          {s.moderatorFeedback ? <p className="mt-1 whitespace-pre-line">{s.moderatorFeedback}</p> : null}
          <Link href={`/submit/${s.id}/1`} className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4">Edit and resubmit</Link>
        </div>
      ) : null}
      {s.status === "approved" && s.trailSlug ? <p><Link href={`/trails/${s.trailSlug}`} className="underline underline-offset-4">View the published trail</Link></p> : null}
      {s.status === "rejected" && s.moderatorFeedback ? <p className="whitespace-pre-line">{s.moderatorFeedback}</p> : null}
      <p className="text-sm text-muted">Last updated {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
      <p><Link href="/account/contributions" className="underline underline-offset-4">All your contributions</Link></p>
    </section>
  );
}
