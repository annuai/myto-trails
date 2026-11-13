"use client";

import { useActionState } from "react";
import { joinListAction } from "@/app/app/actions";
import { Notice } from "@/ui/Notice/Notice";
import { SubmitButton } from "@/ui/SubmitButton/SubmitButton";

const phones = [
  { value: "android", label: "Android" },
  { value: "iphone", label: "iPhone" },
];

/** Email, plus the phone you ride with so we know how many people are waiting for iPhone. */
export function JoinListForm() {
  const [state, action] = useActionState(joinListAction, { error: null, success: false });

  if (state.success) return <Notice tone="info" title="You are on the list.">We will write as the app comes together, and once when it is live.</Notice>;

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div aria-hidden className="absolute -left-[9999px] size-0 overflow-hidden">
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Email address</span>
          <input type="email" name="email" required autoComplete="email" defaultValue={state.email} placeholder="you@example.com" aria-describedby={state.error ? "join-error" : undefined} className="min-h-12 w-full rounded-lg border border-foreground/40 bg-background px-4 text-foreground placeholder:text-muted" />
        </label>
        <SubmitButton className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Join the list</SubmitButton>
      </div>
      <fieldset className="flex flex-wrap items-center gap-x-5">
        <legend className="sr-only">Which phone do you ride with?</legend>
        <span aria-hidden className="text-sm text-muted">I ride with</span>
        {phones.map((p) => (
          <label key={p.value} className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name="platform" value={p.value} className="size-4 accent-accent" />
            {p.label}
          </label>
        ))}
      </fieldset>
      {state.error ? <p id="join-error" role="alert" className="text-sm text-status-stop">{state.error}</p> : null}
    </form>
  );
}
