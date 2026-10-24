import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { listMine } from "@/server/submissions/service";
import { discardDraftAction, startSubmissionAction } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Submit a trail", robots: { index: false, follow: false } };

export default async function SubmitPage({ searchParams }: PageProps<"/submit">) {
  const user = await requireUser("/submit");
  const sp = await searchParams;
  const drafts = (await listMine(getSql(), user.id)).filter((s) => s.status === "draft");

  return (
    <section className="flex max-w-prose flex-col gap-8 py-8">
      <h1 className="text-3xl font-semibold leading-tight">Submit a trail</h1>
      <p>Share a trail you have ridden. It takes about ten minutes: the basics, your GPX, the terrain, who can ride there and how you know, and a few photos. Your draft is saved as you go, and a moderator reads everything before it is published.</p>
      <ul className="list-disc pl-5">
        <li>Only submit trails you rode or know first-hand.</li>
        <li>Say honestly whether riders need permission. Access matters more than anything else on the page.</li>
        <li>Don&apos;t share the exact start of a private home, farm or sensitive habitat.</li>
      </ul>
      {sp.error === "too_many_drafts" ? <p role="alert" className="border-l-4 border-status-stop py-1 pl-4 font-medium">You have ten drafts open. Finish or delete one first.</p> : null}
      <form action={startSubmissionAction}>
        <button type="submit" className="min-h-12 rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Start a new trail</button>
      </form>

      {drafts.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Your drafts</h2>
          <ul className="flex flex-col gap-3">
            {drafts.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-4 border-b border-border pb-3">
                <Link href={`/submit/${d.id}/1`} className="inline-flex min-h-11 items-center underline underline-offset-4">{d.title ?? "Untitled draft"}</Link>
                <form action={discardDraftAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" className="min-h-11 text-sm text-muted underline underline-offset-4">Delete draft</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p><Link href="/account/contributions" className="underline underline-offset-4">Your submitted trails</Link></p>
    </section>
  );
}
