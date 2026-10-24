import Link from "next/link";
import type { RiddenSummary } from "@/server/community/ridden";
import { resultMessage } from "./messages";

type Action = (formData: FormData) => void | Promise<void>;
const input = "min-h-12 w-full rounded-lg border border-foreground/40 bg-background px-3";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-09-01" as "Sep 2026", written out so it never depends on the browser's locale data. */
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

/** Who says they have ridden this trail: a count, the riders who chose to be listed, and the button to add yourself. */
export function RiddenPanel({
  slug, summary, signedIn, code, maxMonth, actions, ownRiderId = null,
}: {
  slug: string;
  summary: RiddenSummary;
  signedIn: boolean;
  /** Result code from the last action, shown as a message. */
  code?: string;
  /** The current month as YYYY-MM, the latest month a ride can be dated. */
  maxMonth: string;
  actions: { mark: Action; unmark: Action; ask?: Action };
  /** The viewer's own rider handle, so they are not offered a form to ask themselves. */
  ownRiderId?: string | null;
}) {
  const msg = resultMessage(code);
  const { count, riders, unlisted, mine, lastRidden } = summary;
  return (
    <section id="riders" aria-labelledby="riders-title" className="flex flex-col gap-5">
      <h2 id="riders-title" className="text-xl font-semibold">Riders who have been here</h2>
      <p>
        {count === 0 ? "Nobody has said they have ridden here yet." : <><span className="font-medium">{count} {count === 1 ? "rider says" : "riders say"}</span> they have ridden here</>}
        {lastRidden ? <span className="text-muted"> · latest {monthLabel(lastRidden)}</span> : null}
      </p>
      {msg && (code?.startsWith("ridden") || code === "unridden" || code?.startsWith("ask_")) ? <p role="status" className={`border-l-4 py-1 pl-4 ${msg.tone === "stop" ? "border-status-stop" : msg.tone === "caution" ? "border-status-caution" : "border-status-good"}`}>{msg.text}</p> : null}

      {mine ? (
        <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-card-cream p-5">
          <p className="font-medium">You have ridden here{mine.riddenMonth ? ` (${monthLabel(mine.riddenMonth)})` : ""}.</p>
          <form action={actions.unmark}>
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Remove me from the list</button>
          </form>
        </div>
      ) : signedIn ? (
        <details className="rounded-3xl bg-card-cream p-5">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-accent px-5 text-sm font-medium text-white">I&apos;ve ridden here</summary>
          <form action={actions.mark} className="mt-4 flex max-w-md flex-col gap-3">
            <input type="hidden" name="slug" value={slug} />
            <label htmlFor="ridden-month" className="text-sm font-medium">When? (optional)</label>
            <input id="ridden-month" name="month" type="month" max={maxMonth} className={input} />
            <label htmlFor="ridden-bike" className="text-sm font-medium">Which bike? (optional)</label>
            <input id="ridden-bike" name="bike" maxLength={60} className={input} />
            <label htmlFor="ridden-note" className="text-sm font-medium">A note for other riders (optional)</label>
            <input id="ridden-note" name="note" maxLength={200} className={input} />
            <button type="submit" className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Add me to the list</button>
          </form>
        </details>
      ) : (
        <Link href={`/sign-in?next=${encodeURIComponent(`/trails/${slug}#riders`)}`} className="inline-flex min-h-12 w-fit items-center rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">I&apos;ve ridden here</Link>
      )}

      {riders.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {riders.map((r) => (
            <li key={r.riderId} className="rounded-3xl bg-card-cream p-4">
              <p className="font-medium"><Link href={`/riders/${r.riderId}`} className="underline-offset-4 hover:underline">{r.displayName}</Link></p>
              <p className="text-sm text-muted">{[r.bike, r.riddenMonth ? monthLabel(r.riddenMonth) : null].filter(Boolean).join(" · ") || "Rider"}</p>
              {r.note ? <p className="mt-1 text-sm">{r.note}</p> : null}
              {signedIn && actions.ask && r.riderId !== ownRiderId ? (
                <details className="mt-2">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">Ask {r.displayName} a question</summary>
                  <form action={actions.ask} className="mb-1 flex flex-col gap-2">
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="riderId" value={r.riderId} />
                    <label htmlFor={`ask-${r.riderId}`} className="text-sm">Your question about this trail</label>
                    <textarea id={`ask-${r.riderId}`} name="question" rows={3} minLength={5} maxLength={500} required className="w-full rounded-lg border border-foreground/40 bg-background px-3 py-2" />
                    <p className="text-xs text-muted">{r.displayName} gets an email and can answer, decline, or block you. No web addresses, please.</p>
                    <button type="submit" className="min-h-11 self-start rounded-lg bg-accent px-4 text-sm font-medium text-white">Send question</button>
                  </form>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {unlisted > 0 ? <p className="text-sm text-muted">+ {unlisted} more {unlisted === 1 ? "rider who keeps" : "riders who keep"} their profile private</p> : null}
      <p className="text-xs text-muted">Self-reported by riders. It doesn&apos;t mean a trail is open or that you are allowed to ride there.</p>
    </section>
  );
}
