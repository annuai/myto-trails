"use client";

import { useActionState, useEffect, useState } from "react";
import type { RevealState } from "./question-actions";

/** Shows a phone number for the time left, with a countdown, a copy button and a contact card to save it. */
export function RevealPhone({ questionId, otherName, action, label = "Reveal the number" }: { questionId: string; otherName: string; action: (prev: RevealState, formData: FormData) => Promise<RevealState>; label?: string }) {
  const [state, formAction, pending] = useActionState(action, {} as RevealState);
  const [left, setLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.remainingSeconds === undefined) return;
    const end = Date.now() + state.remainingSeconds * 1000;
    const tick = () => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state]);

  if (state.phone && left !== null && left > 0) {
    const mm = String(Math.floor(left / 60)).padStart(1, "0");
    const ss = String(left % 60).padStart(2, "0");
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${otherName.replace(/[\r\n;,]/g, " ")} (Moto Trails)\nTEL;TYPE=CELL:${state.phone}\nEND:VCARD\n`;
    return (
      <div role="status" className="flex flex-col gap-3 rounded-3xl bg-card-cream p-5">
        <p className="text-sm text-muted">{otherName}&apos;s number. Save it now: it disappears when the time runs out.</p>
        <p className="font-mono text-3xl tracking-tight" data-testid="revealed-phone">{state.phone}</p>
        <p className="font-mono text-sm" aria-live="off">Time left {mm}:{ss}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={async () => { await navigator.clipboard?.writeText(state.phone!); setCopied(true); }} className="min-h-11 rounded-lg border border-foreground px-4 text-sm font-medium">{copied ? "Copied" : "Copy number"}</button>
          <a href={`data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`} download={`${otherName.replace(/[^\w-]+/g, "-")}.vcf`} className="inline-flex min-h-11 items-center rounded-lg border border-foreground px-4 text-sm font-medium">Save to contacts</a>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="questionId" value={questionId} />
      {state.phone && left === 0 ? <p role="status" className="text-sm font-medium">Time is up: the number has been deleted.</p> : null}
      {state.error ? <p role="alert" className="text-sm font-medium text-status-stop">{state.error}</p> : null}
      {!(state.phone && left === 0) ? (
        <>
          <p className="text-sm text-muted">Once you press Reveal you will see the number for 5 minutes. Save it to your contacts in that time.</p>
          <button type="submit" disabled={pending} className="min-h-11 self-start rounded-lg bg-accent px-4 text-sm font-medium text-white">{label}</button>
        </>
      ) : null}
    </form>
  );
}
