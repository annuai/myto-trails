"use client";

import { useActionState, useEffect, useRef } from "react";
import { StepFields, type StepContext } from "./StepFields";

export type WizardState = { errors?: Record<string, string>; values?: Record<string, unknown>; message?: string; saved?: boolean; steps?: number[] };

/**
 * Wraps a step's fields. Works as a normal form without JavaScript; with it, typing is saved in the background
 * after a pause so a closed tab or dropped connection loses nothing.
 */
export function WizardForm({
  id, step, values, ctx, action, autosave,
}: {
  id: string;
  step: number;
  /** What the rider typed last (kept even when it was invalid). */
  values: Record<string, unknown>;
  ctx: StepContext;
  action: (prev: WizardState, formData: FormData) => Promise<WizardState>;
  autosave: (id: string, step: number, formData: FormData) => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as WizardState);
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = form.current;
    if (!el) return;
    const schedule = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void autosave(id, step, new FormData(el)), 1500);
    };
    el.addEventListener("input", schedule);
    el.addEventListener("change", schedule);
    return () => {
      clearTimeout(timer.current);
      el.removeEventListener("input", schedule);
      el.removeEventListener("change", schedule);
    };
  }, [autosave, id, step]);

  const last = step === 6;
  const button = "min-h-12 rounded-lg px-5 text-sm font-medium";
  return (
    <form ref={form} action={formAction} className="flex max-w-prose flex-col gap-6">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="step" value={step} />
      {state.message ? <p role="alert" className="border-l-4 border-status-stop py-1 pl-4 font-medium">{state.message}</p> : null}
      {state.saved ? <p role="status" className="text-sm font-medium text-status-good">Draft saved.</p> : null}
      <StepFields step={step} values={state.values ?? values} errors={state.errors ?? {}} ctx={ctx} />
      <div className="flex flex-wrap gap-3">
        {last ? (
          <button type="submit" name="intent" value="submit" disabled={pending} className={`${button} bg-accent text-white hover:bg-accent-hover`}>Submit for review</button>
        ) : (
          <button type="submit" name="intent" value="next" disabled={pending} className={`${button} bg-accent text-white hover:bg-accent-hover`}>Save and continue</button>
        )}
        <button type="submit" name="intent" value="save" disabled={pending} className={`${button} border border-foreground`}>Save draft</button>
      </div>
    </form>
  );
}
