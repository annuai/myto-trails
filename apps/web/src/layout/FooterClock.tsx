"use client";

import { useEffect, useState } from "react";
import { formatClock, rideMessage } from "./ride-message";

/**
 * India Standard Time as a large clock with a badge underneath. It renders after mount, so the server and the
 * browser never disagree about the time. The badge uses a moon or sun as well as words, so it never relies on colour.
 */
export function FooterClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const msg = now ? rideMessage(now) : null;
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">India</p>
      <p className="font-mono text-4xl tabular-nums sm:text-5xl" aria-label={now ? `Time in India ${formatClock(now)}` : "Time in India"} suppressHydrationWarning>
        <span aria-hidden="true">{now ? formatClock(now) : "--:--:-- --"}</span>
      </p>
      <p className="font-mono text-xs uppercase tracking-widest text-muted/80">IST · UTC +5:30</p>
      <p
        role="status"
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
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
