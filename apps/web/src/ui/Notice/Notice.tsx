import type { ReactNode } from "react";

type Tone = "info" | "caution" | "stop";

const bar: Record<Tone, string> = {
  info: "border-status-info text-status-info",
  caution: "border-status-caution text-status-caution",
  stop: "border-status-stop text-status-stop",
};

function Icon({ tone }: { tone: Tone }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": true, className: "mt-1 shrink-0" } as const;
  if (tone === "stop") return <svg {...common}><rect x="2" y="2" width="12" height="12" fill="currentColor" /></svg>;
  if (tone === "caution") return <svg {...common}><path d="M8 2 15 14H1z" fill="currentColor" /></svg>;
  return <svg {...common}><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7v4M8 4.5v1" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

/** A status message: a left bar, a glyph and a title, so tone is never carried by colour alone. */
export function Notice({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  return (
    <div role={tone === "stop" ? "alert" : "status"} className={`flex gap-3 border-l-4 py-1 pl-4 ${bar[tone]}`}>
      <Icon tone={tone} />
      <div>
        <p className="font-medium">{title}</p>
        {children ? <div className="mt-1 text-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
