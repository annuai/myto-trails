import type { ReactNode } from "react";

/** A small rounded label for a fact (distance, difficulty, ...). */
export function Chip({ children, tone = "neutral", title }: { children: ReactNode; tone?: "neutral" | "good" | "caution" | "stop" | "unknown"; title?: string }) {
  const tones = {
    neutral: "border-border bg-background text-foreground",
    good: "border-status-good/30 bg-status-good/10 text-status-good",
    caution: "border-status-caution/30 bg-status-caution/10 text-status-caution",
    stop: "border-status-stop/30 bg-status-stop/10 text-status-stop",
    unknown: "border-border bg-background text-status-unknown",
  } as const;
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
