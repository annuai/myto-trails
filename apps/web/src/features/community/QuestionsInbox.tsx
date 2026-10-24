import type { QuestionView } from "@/server/community/questions";
import type { RevealState } from "./question-actions";
import { RevealPhone } from "./RevealPhone";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";

type Action = (formData: FormData) => void | Promise<void>;
const input = "w-full rounded-lg border border-foreground/40 bg-background px-3 py-2";
const STATUS: Record<QuestionView["status"], string> = { pending: "Waiting for an answer", answered: "Answered", declined: "Declined", expired: "Expired" };
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const minutes = (s: number) => (s >= 3600 ? `${Math.ceil(s / 3600)} h` : `${Math.max(1, Math.ceil(s / 60))} min`);

export type InboxActions = {
  answer: Action; decline: Action; block: Action; report: Action; offer: Action; withdraw: Action;
  reveal: (prev: RevealState, formData: FormData) => Promise<RevealState>;
};

function Hidden({ id }: { id: string }) {
  return <input type="hidden" name="questionId" value={id} />;
}

function Received({ q, a }: { q: QuestionView; a: InboxActions }) {
  return (
    <li className="flex flex-col gap-3 rounded-3xl bg-card-cream p-5">
      <p className="text-sm text-muted">{q.otherName} asked{q.trailName ? <> about <span className="text-foreground">{q.trailName}</span></> : null} · {when(q.createdAt)} · {STATUS[q.status]}</p>
      <p className="whitespace-pre-line break-words font-medium">{q.question}</p>
      {q.answer ? <p className="whitespace-pre-line break-words"><span className="text-sm text-muted">You answered: </span>{q.answer}</p> : null}

      {q.status === "pending" ? (
        <div className="flex flex-col gap-3">
          <form action={a.answer} className="flex flex-col gap-2">
            <Hidden id={q.id} />
            <label htmlFor={`ans-${q.id}`} className="text-sm font-medium">Your answer</label>
            <textarea id={`ans-${q.id}`} name="answer" rows={3} maxLength={1000} required className={input} />
            <SubmitButton className="min-h-11 self-start rounded-lg bg-accent px-4 text-sm font-medium text-white">Send answer</SubmitButton>
          </form>
          <div className="flex flex-wrap gap-x-5">
            <form action={a.decline}><Hidden id={q.id} /><SubmitButton className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Decline</SubmitButton></form>
            <form action={a.block}><Hidden id={q.id} /><SubmitButton className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Block this rider</SubmitButton></form>
            <details>
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-muted underline underline-offset-4">Report</summary>
              <form action={a.report} className="mb-2 flex max-w-md flex-col gap-2">
                <Hidden id={q.id} />
                <label htmlFor={`rep-${q.id}`} className="text-sm">What is the problem?</label>
                <input id={`rep-${q.id}`} name="reason" minLength={5} maxLength={500} required className={input} />
                <SubmitButton className="min-h-11 self-start rounded-lg border border-foreground px-4 text-sm font-medium">Send report</SubmitButton>
              </form>
            </details>
          </div>
        </div>
      ) : null}

      {q.canOffer ? (
        <details className="rounded-3xl bg-background p-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium underline underline-offset-4">Share my phone number with {q.otherName}</summary>
          <form action={a.offer} className="mt-2 flex max-w-md flex-col gap-2">
            <Hidden id={q.id} />
            <label htmlFor={`ph-${q.id}`} className="text-sm font-medium">Your number</label>
            <input id={`ph-${q.id}`} name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="98123 45678" className={input} />
            <p className="text-xs text-muted">{q.otherName} must press Reveal within 24 hours. They then see it once, for 5 minutes, and have to save it in that time. After that it is deleted and nobody, including us, can see it. You can take the offer back until it is revealed.</p>
            <SubmitButton className="min-h-11 self-start rounded-lg bg-accent px-4 text-sm font-medium text-white">Offer my number</SubmitButton>
          </form>
        </details>
      ) : null}
      {q.share.state === "offered" ? (
        <form action={a.withdraw} className="flex flex-wrap items-center gap-3">
          <Hidden id={q.id} />
          <p className="text-sm">Your number is offered to {q.otherName} ({minutes(q.share.remainingSeconds)} left to reveal it).</p>
          <SubmitButton className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Take it back</SubmitButton>
        </form>
      ) : null}
      {q.share.state === "revealed" ? <p className="text-sm">{q.otherName} has seen your number. It is deleted now or within minutes.</p> : null}
      {q.share.state === "expired" ? <p className="text-sm text-muted">The number offer ended and the number was deleted.</p> : null}
    </li>
  );
}

function Sent({ q, a }: { q: QuestionView; a: InboxActions }) {
  return (
    <li className="flex flex-col gap-3 rounded-3xl bg-card-cream p-5">
      <p className="text-sm text-muted">You asked {q.otherName}{q.trailName ? <> about <span className="text-foreground">{q.trailName}</span></> : null} · {when(q.createdAt)} · {STATUS[q.status]}</p>
      <p className="whitespace-pre-line break-words">{q.question}</p>
      {q.answer ? <p className="whitespace-pre-line break-words font-medium"><span className="text-sm font-normal text-muted">{q.otherName} answered: </span>{q.answer}</p> : null}
      {q.canReveal ? (
        <div className="rounded-3xl bg-background p-4">
          <p className="mb-2 text-sm font-medium">{q.otherName} offered you their phone number.</p>
          <RevealPhone questionId={q.id} otherName={q.otherName} action={a.reveal} />
        </div>
      ) : null}
      {q.share.state === "expired" ? <p className="text-sm text-muted">A phone number was offered, and it is no longer available.</p> : null}
    </li>
  );
}

/** Questions you received and sent, with answering, blocking, reporting and time-limited phone sharing. */
export function QuestionsInbox({ received, sent, blocked, actions, unblock }: { received: QuestionView[]; sent: QuestionView[]; blocked: { blockedId: string; name: string }[]; actions: InboxActions; unblock: Action }) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="received"><h2 id="received" className="text-xl font-semibold">Questions for you</h2>
        {received.length === 0 ? <p className="mt-3 text-muted">Nobody has asked you anything yet. Riders can only ask you if your profile is public.</p> : <ul className="mt-4 flex flex-col gap-4">{received.map((q) => <Received key={q.id} q={q} a={actions} />)}</ul>}
      </section>
      <section aria-labelledby="sent"><h2 id="sent" className="text-xl font-semibold">Questions you asked</h2>
        {sent.length === 0 ? <p className="mt-3 text-muted">You haven&apos;t asked anyone. Open a trail and use &quot;Ask a question&quot; on a rider who has been there.</p> : <ul className="mt-4 flex flex-col gap-4">{sent.map((q) => <Sent key={q.id} q={q} a={actions} />)}</ul>}
      </section>
      {blocked.length > 0 ? (
        <section aria-labelledby="blocked"><h2 id="blocked" className="text-xl font-semibold">Riders you blocked</h2>
          <ul className="mt-3 flex flex-col gap-2">{blocked.map((b) => (
            <li key={b.blockedId} className="flex flex-wrap items-center gap-4"><span>{b.name}</span>
              <form action={unblock}><input type="hidden" name="blockedId" value={b.blockedId} /><SubmitButton className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Unblock</SubmitButton></form>
            </li>))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
