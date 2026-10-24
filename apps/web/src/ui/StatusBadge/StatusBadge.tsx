import type { AccessClass, OperationalStatus, VerificationLevel } from "@moto-trails/domain";
import { formatDate } from "@/lib/format";
import { statusFor, type Glyph, type Tone } from "./status-map";

type Props = { date?: string; size?: "md" | "lg" } & (
  | { kind: "access"; value: AccessClass }
  | { kind: "condition"; value: OperationalStatus }
  | { kind: "verification"; value: VerificationLevel }
);

const toneClass: Record<Tone, string> = {
  good: "text-status-good",
  caution: "text-status-caution",
  stop: "text-status-stop",
  unknown: "text-status-unknown",
};

function GlyphIcon({ glyph }: { glyph: Glyph }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": true, className: "shrink-0" } as const;
  switch (glyph) {
    case "circle":
      return <svg {...common}><circle cx="8" cy="8" r="6" fill="currentColor" /></svg>;
    case "open-circle":
      return <svg {...common}><circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2" /></svg>;
    case "triangle":
      return <svg {...common}><path d="M8 2 15 14H1z" fill="currentColor" /></svg>;
    case "square":
      return <svg {...common}><rect x="2" y="2" width="12" height="12" fill="currentColor" /></svg>;
    case "diamond":
      return <svg {...common}><path d="M8 1 15 8 8 15 1 8z" fill="currentColor" /></svg>;
    case "check":
      return <svg {...common}><path d="M2 8.5 6 12.5 14 3.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
  }
}

export function StatusBadge(props: Props) {
  const { label, tone, glyph } = statusFor(props.kind as "access", props.value as AccessClass);
  return (
    <span className={`inline-flex items-center gap-2 font-medium ${props.size === "lg" ? "text-base" : "text-sm"} ${toneClass[tone]}`}>
      <GlyphIcon glyph={glyph} />
      <span>{label}</span>
      {props.date ? <span className="font-mono text-muted">{formatDate(props.date)}</span> : null}
    </span>
  );
}
