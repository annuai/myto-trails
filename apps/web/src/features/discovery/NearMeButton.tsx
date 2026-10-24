"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NEAR_COOKIE, NEAR_COOKIE_MAX_AGE, serializeNearCookie } from "@/lib/near-cookie";

type State = { kind: "idle" } | { kind: "locating" } | { kind: "message"; text: string };

/** Asks for the browser location only after a click. The point is rounded and kept in a short-lived cookie, never in the URL. */
export function NearMeButton({ href = "/trails?near=me" }: { href?: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ kind: "message", text: "Location isn't available in this browser. Search for a place instead." });
      return;
    }
    setState({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const value = encodeURIComponent(serializeNearCookie({ lat: pos.coords.latitude, lon: pos.coords.longitude }));
        document.cookie = `${NEAR_COOKIE}=${value}; max-age=${NEAR_COOKIE_MAX_AGE}; path=/trails; samesite=lax`;
        setState({ kind: "idle" });
        router.push(href);
      },
      () => setState({ kind: "message", text: "We couldn't get your location. Search for a place instead." }),
      { maximumAge: 60_000, timeout: 15_000 },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={locate}
        disabled={state.kind === "locating"}
        className="inline-flex min-h-11 items-center rounded-md border border-foreground px-4 text-sm font-medium disabled:opacity-60"
      >
        {state.kind === "locating" ? "Locating…" : "Use my location"}
      </button>
      {state.kind === "message" ? (
        <p role="status" className="mt-2 text-sm text-muted">{state.text}</p>
      ) : null}
    </div>
  );
}
