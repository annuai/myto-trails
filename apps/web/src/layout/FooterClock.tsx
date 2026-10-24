"use client";

import { useSyncExternalStore } from "react";
import { formatClock, rideMessage } from "./ride-message";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

/**
 * India Standard Time as a clock with a badge underneath, sized like the clock on myto-moto.com. It renders after
 * mount, so the server and the browser never disagree about the time. The badge carries a moon or sun as well as
 * words, so it never relies on colour.
 */
export function FooterClock() {
  // A once-a-second tick from the browser clock; the server (and first hydration) sees no time at all.
  const second = useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 1000), () => null);
  const now = second === null ? null : new Date(second * 1000);

  const msg = now ? rideMessage(now) : null;
  return (
    <div className="flex flex-col sm:items-end">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted">Kerala, India</p>
      <p className="font-mono text-2xl font-medium tracking-tight tabular-nums" aria-label={now ? `Time in India ${formatClock(now)}` : "Time in India"} suppressHydrationWarning>
        <span aria-hidden="true">{now ? formatClock(now) : "—:—:—"}</span>
      </p>
      <p className="mt-1.5 font-mono text-xs text-muted/45">IST · UTC +5:30</p>
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
