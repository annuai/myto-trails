import type { Metadata } from "next";
import Link from "next/link";
import { getSql } from "@/server/db/client";
import { listCommentQueue } from "@/server/moderation/comments";
import { requireModerator } from "@/server/moderation/session";
import { commentModerationAction } from "../actions";

export const instant = false;
export const metadata: Metadata = { title: "Comments", robots: { index: false, follow: false } };
const input = "min-h-12 w-full rounded-lg border border-foreground/40 bg-background px-3";

export default async function CommentsModerationPage({ searchParams }: PageProps<"/moderate/comments">) {
  const actor = await requireModerator("/moderate/comments");
  const q = await listCommentQueue(getSql(), actor.id);
  const sp = await searchParams;
  const items = q.ok ? q.items : [];
  return (
    <section className="flex max-w-3xl flex-col gap-6 py-8">
      <Link href="/moderate" className="text-sm underline underline-offset-4">Back to the queue</Link>
      <h1 className="text-3xl font-semibold leading-tight">Comments ({items.length})</h1>
      {sp.result === "saved" ? <p role="status" className="border-l-4 border-status-good py-1 pl-4 font-medium">Saved.</p> : typeof sp.result === "string" ? <p role="alert" className="border-l-4 border-status-stop py-1 pl-4 font-medium">That did not go through: {sp.result.replaceAll("_", " ")}.</p> : null}
      {items.length === 0 ? <p className="text-muted">Nothing is waiting.</p> : (
        <ul className="flex flex-col gap-6">
          {items.map((i) => (
            <li key={i.commentId} className="flex flex-col gap-3 rounded-3xl bg-card-cream p-5">
              <p className="text-sm text-muted"><Link href={`/trails/${i.trailSlug}#comments`} className="underline underline-offset-4">{i.trailName}</Link> · {i.authorName} · {i.status === "pending" ? "waiting for approval" : `${i.reports.length} report(s)`}</p>
              <p className="whitespace-pre-line break-words">{i.body}</p>
              {i.reports.length > 0 ? <ul className="list-disc pl-5 text-sm">{i.reports.map((r, k) => <li key={k}>{r.reason}</li>)}</ul> : null}
              <form action={commentModerationAction} className="flex flex-col gap-3">
                <input type="hidden" name="commentId" value={i.commentId} />
                <label htmlFor={`reason-${i.commentId}`} className="text-sm font-medium">Reason (needed to hide)</label>
                <input id={`reason-${i.commentId}`} name="reason" maxLength={500} className={input} />
                <div className="flex flex-wrap gap-3">
                  {i.status === "pending" ? <button type="submit" name="action" value="approve" className="min-h-12 rounded-lg bg-accent px-5 text-sm font-medium text-white">Approve</button> : <button type="submit" name="action" value="dismiss" className="min-h-12 rounded-lg border border-foreground px-5 text-sm font-medium">Dismiss reports</button>}
                  <button type="submit" name="action" value="hide" className="min-h-12 rounded-lg border border-status-stop px-5 text-sm font-medium text-status-stop">Hide</button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
