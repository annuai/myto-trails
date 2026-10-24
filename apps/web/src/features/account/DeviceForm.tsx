"use client";

import { useActionState } from "react";

export type DeviceState = { token?: string; error?: string };

/** Creates a device token. The token is shown once, right here, and can't be shown again. */
export function DeviceForm({ action }: { action: (prev: DeviceState, formData: FormData) => Promise<DeviceState> }) {
  const [state, formAction, pending] = useActionState(action, {} as DeviceState);
  const input = "min-h-12 w-full rounded-sm border border-foreground/40 bg-background px-3";
  return (
    <div className="flex max-w-md flex-col gap-4">
      {state.token ? (
        <div role="status" className="border-l-4 border-status-good py-1 pl-4">
          <p className="font-medium">Copy this token now. It is shown only once.</p>
          <p className="mt-2 break-all font-mono text-sm" data-testid="new-token">{state.token}</p>
        </div>
      ) : null}
      {state.error ? <p role="alert" className="border-l-4 border-status-stop py-1 pl-4 font-medium">{state.error}</p> : null}
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="label" className="text-sm font-medium">Name for this device</label>
        <input id="label" name="label" maxLength={60} required className={input} />
        <label htmlFor="kind" className="text-sm font-medium">Kind</label>
        <select id="kind" name="kind" className={input}>
          <option value="app_android">Trails app (Android)</option>
          <option value="app_ios">Trails app (iPhone)</option>
          <option value="navi">Myto Navi</option>
        </select>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-medium">What it may do</legend>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="scopes" value="saved" defaultChecked className="size-5" /> Read and change my Saved trails</label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="scopes" value="write:submission" className="size-5" /> Upload files and submit trails and reports for me</label>
        </fieldset>
        <button type="submit" disabled={pending} className="min-h-12 self-start rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Create token</button>
      </form>
    </div>
  );
}
