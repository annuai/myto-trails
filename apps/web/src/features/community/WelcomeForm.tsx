"use client";

import { useActionState } from "react";
import type { WelcomeState } from "@/app/welcome/actions";

const input = "min-h-12 w-full rounded-lg border border-foreground/40 bg-background px-3";

/** The one-time step after the first sign-in: the declaration, a display name and the visibility choice. */
export function WelcomeForm({ action, next, displayName }: { action: (prev: WelcomeState, formData: FormData) => Promise<WelcomeState>; next: string; displayName: string }) {
  const [state, formAction, pending] = useActionState(action, {} as WelcomeState);
  const v = state.values;
  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      {state.error ? <p role="alert" className="border-l-4 border-status-stop py-1 pl-4 font-medium">{state.error}</p> : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium">Your name on Moto Trails</label>
        <input id="displayName" name="displayName" defaultValue={v?.displayName ?? displayName} minLength={2} maxLength={40} required className={input} aria-describedby="name-help" />
        <p id="name-help" className="text-sm text-muted">Shown with your comments and trails. Use the name you ride under.</p>
      </div>

      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" name="declaration" required className="mt-1 size-5" />
        <span>I am <strong>18 or older</strong> and I hold a <strong>valid driving licence</strong>.</span>
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Should other riders see you on trail pages?</legend>
        <label className="flex min-h-11 items-start gap-3">
          <input type="radio" name="visibility" value="private" defaultChecked={v?.profilePublic !== "public"} className="mt-1 size-5" required />
          <span><span className="font-medium">Keep me private</span><span className="block text-sm text-muted">You are counted in &quot;ridden here&quot; totals but not listed, and nobody can ask you a question.</span></span>
        </label>
        <label className="flex min-h-11 items-start gap-3">
          <input type="radio" name="visibility" value="public" defaultChecked={v?.profilePublic === "public"} className="mt-1 size-5" />
          <span><span className="font-medium">Show me to other riders</span><span className="block text-sm text-muted">Your name is listed on trails you have ridden, and riders can ask you questions. You choose whether to share a phone number, case by case. You can change this any time in Account.</span></span>
        </label>
      </fieldset>

      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" name="isWoman" defaultChecked={v?.isWoman} className="mt-1 size-5" />
        <span><span className="font-medium">I am a woman rider (optional)</span><span className="block text-sm text-muted">Private. Lets you create and join women-only clubs. It is never shown on your profile.</span></span>
      </label>

      <button type="submit" disabled={pending} className="min-h-12 self-start rounded-lg bg-accent px-6 text-sm font-medium text-white hover:bg-accent-hover">Continue</button>
    </form>
  );
}
