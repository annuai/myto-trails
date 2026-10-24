import type { Metadata } from "next";
import { ACCESS_CLASSES, OPERATIONAL_STATUSES, VERIFICATION_LEVELS } from "@moto-trails/domain";
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

const swatches = [
  ["background", "bg-background"],
  ["surface", "bg-surface"],
  ["foreground", "bg-foreground"],
  ["muted", "bg-muted"],
  ["accent", "bg-accent"],
  ["accent-subtle", "bg-accent-subtle"],
  ["status-good", "bg-status-good"],
  ["status-caution", "bg-status-caution"],
  ["status-stop", "bg-status-stop"],
  ["status-unknown", "bg-status-unknown"],
  ["status-info", "bg-status-info"],
  ["dark", "bg-dark"],
] as const;

export default function DesignPage() {
  return (
    <div className="flex flex-col gap-(--space-section) py-(--space-section)">
      <header>
        <h1 className="font-display text-3xl leading-tight">Design system</h1>
        <p className="mt-4 max-w-prose text-muted">Tokens and primitives for Moto Trails. Internal reference; not indexed.</p>
      </header>

      <section aria-labelledby="colour">
        <h2 id="colour" className="text-xl font-semibold">Colour</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {swatches.map(([name, cls]) => (
            <li key={name}>
              <div className={`h-12 rounded-sm border border-border ${cls}`} />
              <p className="mt-2 font-mono text-xs text-muted">{name}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type">
        <h2 id="type" className="text-xl font-semibold">Type</h2>
        <div className="mt-6 flex flex-col gap-3">
          <p className="font-display text-3xl">Display, Michroma</p>
          <p className="text-2xl font-semibold">Heading, Geist</p>
          <p className="text-base">Body text, Geist 16 on a 1.6 line height, kept under 70 characters per line.</p>
          <p className="font-mono text-sm">24.1 km · +612 m · 14 Aug 2026</p>
        </div>
      </section>

      <section aria-labelledby="status">
        <h2 id="status" className="text-xl font-semibold">Status badges</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          <ul className="flex flex-col gap-3" aria-label="Access">
            {ACCESS_CLASSES.map((v) => (
              <li key={v}><StatusBadge kind="access" value={v} /></li>
            ))}
          </ul>
          <ul className="flex flex-col gap-3" aria-label="Condition">
            {OPERATIONAL_STATUSES.map((v) => (
              <li key={v}><StatusBadge kind="condition" value={v} /></li>
            ))}
          </ul>
          <ul className="flex flex-col gap-3" aria-label="Verification">
            {VERIFICATION_LEVELS.map((v) => (
              <li key={v}><StatusBadge kind="verification" value={v} date="2026-08-14" /></li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="focus">
        <h2 id="focus" className="text-xl font-semibold">Focus</h2>
        <p className="mt-4 text-muted">Every interactive element shows a 2 px accent outline on keyboard focus.</p>
        <a href="#focus" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover">
          Focus this link
        </a>
      </section>
    </div>
  );
}
