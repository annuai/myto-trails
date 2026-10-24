"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NEAR_COOKIE, NEAR_COOKIE_MAX_AGE, serializeNearCookie } from "@/lib/near-cookie";

type State = { kind: "idle" } | { kind: "locating" } | { kind: "message"; text: string };

/** Asks for the browser location only after a click. The point is rounded and kept in a short-lived cookie, never in the URL. */
export function NearMeButton({ href = "/trails?near=me", variant = "default" }: { href?: string; variant?: "default" | "inline" }) {
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

  const inline = variant === "inline";
  return (
    <div className={inline ? "relative" : undefined}>
      <button
        type="button"
        onClick={locate}
        disabled={state.kind === "locating"}
        className={
          inline
            ? "inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-lg border border-foreground/40 bg-white px-4 text-sm font-medium hover:bg-background disabled:opacity-60"
            : "inline-flex min-h-11 items-center rounded-lg border border-foreground px-4 text-sm font-medium disabled:opacity-60"
        }
      >
        {inline ? (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1v3M8 12v3M1 8h3M12 8h3" strokeLinecap="round" />
          </svg>
        ) : null}
        {state.kind === "locating" ? "Locating…" : inline ? "Trails near me" : "Use my location"}
      </button>
      {state.kind === "message" ? (
        <p role="status" className={inline ? "absolute right-0 top-full z-10 mt-2 w-64 rounded-lg bg-white p-3 text-sm shadow-nav" : "mt-2 text-sm text-muted"}>{state.text}</p>
      ) : null}
    </div>
  );
}
