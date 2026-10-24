import type { ReactNode } from "react";

/** A label with its value; use inside a <dl>. */
export function DataPair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-medium">{children}</dd>
    </div>
  );
}
