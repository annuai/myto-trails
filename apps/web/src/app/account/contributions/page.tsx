import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { listMine } from "@/server/submissions/service";
import { statusLabel } from "@/features/submit/status";

export const instant = false;
export const metadata: Metadata = { title: "Your contributions", robots: { index: false, follow: false } };

export default async function ContributionsPage() {
  const user = await requireUser("/account/contributions");
  const items = await listMine(getSql(), user.id);
  return (
    <section className="flex max-w-prose flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold leading-tight">Your contributions</h1>
      {items.length === 0 ? (
        <p className="text-muted">You haven&apos;t submitted a trail yet. <Link href="/submit" className="underline underline-offset-4">Start one</Link>.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <Link href={s.status === "draft" ? `/submit/${s.id}/1` : `/account/contributions/${s.id}`} className="inline-flex min-h-11 items-center underline underline-offset-4">{s.title ?? "Untitled draft"}</Link>
              <span className="text-sm">{statusLabel(s.status)}</span>
            </li>
          ))}
        </ul>
      )}
      <p><Link href="/submit" className="underline underline-offset-4">Submit another trail</Link></p>
    </section>
  );
}
