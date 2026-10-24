import Link from "next/link";
import type { CommentTag, CommentView } from "@/server/community/comments";
import { resultMessage } from "./messages";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";

type Action = (formData: FormData) => void | Promise<void>;
const input = "w-full rounded-lg border border-foreground/40 bg-background px-3 py-2";
const TAG_LABEL: Record<CommentTag, string> = { gate_closed: "Gate closed", water_high: "Water high", blocked: "Trail blocked", good_condition: "Good condition", tip: "Tip" };

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function CommentBody({ c, slug, actions, isReply }: { c: CommentView; slug: string; actions: CommentActions; isReply: boolean }) {
  return (
    <article className={isReply ? "rounded-3xl bg-background p-4" : "rounded-3xl bg-card-cream p-5"}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-medium">{c.authorName}</p>
        <p className="text-xs text-muted">{when(c.createdAt)}{c.editedAt ? " · edited" : ""}</p>
        {c.tag ? <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium">{TAG_LABEL[c.tag]}</span> : null}
        {c.pending ? <span className="rounded-full border border-status-caution/40 px-2 py-0.5 text-xs font-medium text-status-caution">Waiting for a moderator</span> : null}
      </header>
      <p className="mt-2 whitespace-pre-line break-words">{c.body}</p>
      <div className="mt-2 flex flex-wrap gap-x-5">
        {c.mine ? (
          <>
            <details>
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">Edit</summary>
              <form action={actions.edit} className="mb-2 flex max-w-xl flex-col gap-2">
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="commentId" value={c.id} />
                <label htmlFor={`edit-${c.id}`} className="sr-only">Edit your comment</label>
                <textarea id={`edit-${c.id}`} name="body" defaultValue={c.body} rows={3} maxLength={1500} required className={input} />
                <SubmitButton className="min-h-11 self-start rounded-lg border border-foreground px-4 text-sm font-medium">Save</SubmitButton>
              </form>
            </details>
            <form action={actions.remove}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="commentId" value={c.id} />
              <SubmitButton className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Delete</SubmitButton>
            </form>
          </>
        ) : actions.canReport ? (
          <details>
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-muted underline underline-offset-4">Report</summary>
            <form action={actions.report} className="mb-2 flex max-w-xl flex-col gap-2">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="commentId" value={c.id} />
              <label htmlFor={`report-${c.id}`} className="text-sm">What is the problem?</label>
              <input id={`report-${c.id}`} name="reason" minLength={5} maxLength={500} required className={input} />
              <SubmitButton className="min-h-11 self-start rounded-lg border border-foreground px-4 text-sm font-medium">Send report</SubmitButton>
            </form>
          </details>
        ) : null}
        {!isReply && actions.canPost && !c.pending ? (
          <details>
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">Reply</summary>
            <form action={actions.post} className="mb-2 flex max-w-xl flex-col gap-2">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="parentId" value={c.id} />
              <label htmlFor={`reply-${c.id}`} className="sr-only">Your reply</label>
              <textarea id={`reply-${c.id}`} name="body" rows={3} maxLength={1500} required className={input} />
              <SubmitButton className="min-h-11 self-start rounded-lg bg-accent px-4 text-sm font-medium text-white">Reply</SubmitButton>
            </form>
          </details>
        ) : null}
      </div>
    </article>
  );
}

type CommentActions = { post: Action; edit: Action; remove: Action; report: Action; canPost: boolean; canReport: boolean };

/** Comments on a trail: conditions, tips and questions from riders. Not a source of permission to ride. */
export function CommentsSection({
  slug, comments, signedIn, code, actions,
}: {
  slug: string;
  comments: CommentView[];
  signedIn: boolean;
  code?: string;
  actions: { post: Action; edit: Action; remove: Action; report: Action };
}) {
  const msg = resultMessage(code);
  const all: CommentActions = { ...actions, canPost: signedIn, canReport: signedIn };
  const total = comments.reduce((n, c) => n + 1 + c.replies.length, 0);
  return (
    <section id="comments" aria-labelledby="comments-title" className="flex flex-col gap-5">
      <h2 id="comments-title" className="text-xl font-semibold">Comments{total > 0 ? ` (${total})` : ""}</h2>
      <p className="max-w-prose text-sm text-muted">Riders&apos; own experience: conditions, gates, water levels, tips. Comments are not permission to ride; check the access information above.</p>
      {msg && code?.startsWith("comment") ? (
        <p role={msg.tone === "stop" ? "alert" : "status"} className={`border-l-4 py-1 pl-4 ${msg.tone === "stop" ? "border-status-stop" : msg.tone === "caution" ? "border-status-caution" : "border-status-good"}`}>{msg.text}</p>
      ) : null}

      {signedIn ? (
        <form action={actions.post} className="flex max-w-2xl flex-col gap-3 rounded-3xl bg-card-cream p-5">
          <input type="hidden" name="slug" value={slug} />
          <label htmlFor="new-comment" className="text-sm font-medium">Add a comment</label>
          <textarea id="new-comment" name="body" rows={4} maxLength={1500} required className={input} />
          <label htmlFor="new-comment-tag" className="text-sm font-medium">Is it a condition report? (optional)</label>
          <select id="new-comment-tag" name="tag" className="min-h-12 w-full rounded-lg border border-foreground/40 bg-background px-3">
            <option value="">No, just a comment</option>
            {(Object.keys(TAG_LABEL) as CommentTag[]).map((t) => <option key={t} value={t}>{TAG_LABEL[t]}</option>)}
          </select>
          <p className="text-xs text-muted">No web addresses, please. Be kind: abusive comments are removed.</p>
          <SubmitButton className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Post comment</SubmitButton>
        </form>
      ) : (
        <p><Link href={`/sign-in?next=${encodeURIComponent(`/trails/${slug}#comments`)}`} className="inline-flex min-h-11 items-center underline underline-offset-4">Sign in to comment</Link></p>
      )}

      {comments.length === 0 ? <p className="text-muted">No comments yet.</p> : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex flex-col gap-3">
              <CommentBody c={c} slug={slug} actions={all} isReply={false} />
              {c.replies.length > 0 ? (
                <ul className="ml-4 flex flex-col gap-3 border-l-2 border-border pl-4 sm:ml-8">
                  {c.replies.map((r) => <li key={r.id}><CommentBody c={r} slug={slug} actions={all} isReply /></li>)}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
