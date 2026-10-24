"use client";

import { useSyncExternalStore } from "react";
import { formatClock, placeFromZone, rideMessage, zoneLabel } from "./ride-message";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

/**
 * The visitor's local time with the place name above it, and a ride badge underneath. The place comes from the
 * server (the hosting platform's approximate location for the request) when it knows it, otherwise from the
 * browser's time zone. It renders after mount, so the server and the browser never disagree about the time.
 */
export function FooterClock({ place, timeZone }: { place?: string | null; timeZone?: string }) {
  // A once-a-second tick from the browser clock; the server (and first hydration) sees no time at all.
  const second = useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 1000), () => null);
  const now = second === null ? null : new Date(second * 1000);
  const zone = timeZone ?? (now ? Intl.DateTimeFormat().resolvedOptions().timeZone : null);

  const ready = now !== null && zone !== null;
  const msg = ready ? rideMessage(now, zone) : null;
  const label = place || (zone ? placeFromZone(zone) : "");
  return (
    <div className="flex flex-col sm:items-end">
      <p className="mb-2.5 min-h-4 text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="font-mono text-2xl font-medium tracking-tight tabular-nums" aria-label={ready ? `Local time in ${label} ${formatClock(now, zone)}` : "Local time"} suppressHydrationWarning>
        <span aria-hidden="true">{ready ? formatClock(now, zone) : "—:—:—"}</span>
      </p>
      <p className="mt-1.5 min-h-4 font-mono text-xs text-muted/45">{ready ? zoneLabel(now, zone) : ""}</p>
      <p role="status" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-xs font-medium">
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
          {msg?.night ? (
            <path d="M12.5 10.2A5.5 5.5 0 0 1 5.8 3.5a5.5 5.5 0 1 0 6.7 6.7Z" fill="currentColor" />
          ) : (
            <g fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="8" cy="8" r="3" fill="currentColor" />
              <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3" />
            </g>
          )}
        </svg>
        {msg?.text ?? "Time for the next ride"}
      </p>
    </div>
  );
}
