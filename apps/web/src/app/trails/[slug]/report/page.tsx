import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportFormClient } from "@/features/report/ReportFormClient";
import { requireUser } from "@/server/auth/session";
import { getTrail } from "@/server/queries/trails";
import { reportAction } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Report an issue", robots: { index: false, follow: false } };

export default async function ReportPage({ params, searchParams }: PageProps<"/trails/[slug]/report">) {
  const { slug } = await params;
  const trail = await getTrail(slug);
  if (!trail) notFound();
  await requireUser(`/trails/${slug}/report`);
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" && /^[0-9A-F]{8}$/.test(sp.ref) ? sp.ref : null;

  return (
    <section className="flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold leading-tight">Report an issue</h1>
      <p className="text-muted">About <Link href={`/trails/${slug}`} className="underline underline-offset-4">{trail.name}</Link></p>
      {ref ? (
        <div role="status" className="max-w-prose border-l-4 border-status-good pl-4">
          <p className="font-medium">Thank you. Your report was sent.</p>
          <p className="mt-1">Reference <span className="font-mono">{ref}</span>. A moderator will review it; you don&apos;t need to do anything else.</p>
          <Link href={`/trails/${slug}`} className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4">Back to the trail</Link>
        </div>
      ) : (
        <ReportFormClient slug={slug} action={reportAction} />
      )}
    </section>
  );
}
