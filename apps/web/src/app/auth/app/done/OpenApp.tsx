"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Only the app's own link (or the local web test build) may be opened from here; anything else in the address is ignored. */
const allowed = (u: string) => u.startsWith("myto://") || (["localhost", "127.0.0.1"].includes(window.location.hostname) && u.startsWith("http://localhost:"));

const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const hash = () => window.location.hash;

/**
 * The hand-back from "Connect the app". A redirect straight from the form is blocked by the page's form-action rule and is
 * often ignored on iOS, so the code comes here in the address fragment (never sent to the server) and the page opens the
 * app itself, with a button for when the phone wants a tap.
 */
export function OpenApp() {
  const fragment = useSyncExternalStore(subscribe, hash, () => null);
  const u = fragment === null ? null : (new URLSearchParams(fragment.slice(1)).get("u") ?? "");
  const link = u !== null && allowed(u) ? u : null;
  useEffect(() => {
    if (link) window.location.href = link;
  }, [link]);

  if (u === null) return <p className="mt-6">Opening the Myto app…</p>;
  if (link === null) return <p className="mt-6 max-w-prose">This link is not valid. Open the Myto app and tap Sign in again.</p>;
  return (
    <div className="mt-6 flex flex-col gap-4">
      <p className="max-w-prose">Your phone should ask to open Myto. If it does not, tap the button.</p>
      <a href={link} className="inline-flex min-h-12 items-center self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Open the Myto app</a>
    </div>
  );
}
