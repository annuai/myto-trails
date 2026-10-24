"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SearchItem } from "@/server/queries/search.sql";
import { SearchResultCard } from "./SearchResultCard";

type State =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "loaded"; items: SearchItem[] }
  | { kind: "empty" }
  | { kind: "denied" }
  | { kind: "outside" }
  | { kind: "error" };

/**
 * "Trails near you": cards for the closest trails with the distance and travel time written under each. The position
 * is requested only after a click (or if the browser already allows it), is sent in a POST body and is never stored.
 */
export function NearbyTrails() {
  const [state, setState] = useState<State>({ kind: "idle" });

  const locate = useCallback(() => {
    setState({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/nearby", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          });
          const body = (await res.json()) as { items?: SearchItem[]; error?: string };
          if (body.error === "outside") return setState({ kind: "outside" });
          if (!res.ok || !body.items) return setState({ kind: "error" });
          setState(body.items.length === 0 ? { kind: "empty" } : { kind: "loaded", items: body.items });
        } catch {
          setState({ kind: "error" });
        }
      },
      () => setState({ kind: "denied" }),
      { enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 15_000 },
    );
  }, []);

  useEffect(() => {
    // If the visitor already allowed location for this site, show the cards without another click.
    let cancelled = false;
    navigator.permissions?.query({ name: "geolocation" }).then((p) => {
      if (!cancelled && p.state === "granted") locate();
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locate]);

  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      {state.kind === "idle" || state.kind === "denied" || state.kind === "error" ? (
        <div className="flex flex-col items-start gap-3 rounded-3xl bg-card-cream p-6">
          <p className="max-w-prose text-muted">See the trails closest to you, with how far each one is and roughly how long it takes to get there.</p>
          <button type="button" onClick={locate} className="min-h-12 rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Show trails near me</button>
          {state.kind === "denied" ? (
            <p role="status" className="text-sm">Your location is off, so we can&apos;t sort by distance. Allow it in your browser, or <Link href="/regions" className="underline underline-offset-4">browse by region</Link>.</p>
          ) : null}
          {state.kind === "error" ? <p role="alert" className="text-sm font-medium text-status-stop">We couldn&apos;t load nearby trails. Please try again.</p> : null}
        </div>
      ) : null}
      {state.kind === "locating" ? <p role="status">Finding your position…</p> : null}
      {state.kind === "empty" ? <p role="status" className="rounded-3xl bg-card-cream p-6">No trails within 300 km yet. <Link href="/trails" className="underline underline-offset-4">See all trails</Link> or <Link href="/submit" className="underline underline-offset-4">add one you know</Link>.</p> : null}
      {state.kind === "outside" ? <p role="status" className="rounded-3xl bg-card-cream p-6">We only list trails in India for now. <Link href="/trails" className="underline underline-offset-4">Browse all trails</Link>.</p> : null}
      {state.kind === "loaded" ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {state.items.map((t) => (
            <li key={t.slug}><SearchResultCard trail={t} /></li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
