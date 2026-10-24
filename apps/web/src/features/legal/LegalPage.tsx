import type { ReactNode } from "react";

/** Shell for text pages. Pages that carry legal weight say they are drafts until a lawyer has reviewed them. */
export function LegalPage({ title, draft = false, children }: { title: string; draft?: boolean; children: ReactNode }) {
  return (
    <article className="flex max-w-prose flex-col gap-6 py-(--space-section)">
      <h1 className="font-display text-3xl leading-tight">{title}</h1>
      {draft ? <p role="note" className="border-l-4 border-status-caution py-1 pl-4 text-sm">Draft text, pending legal review. It may change before launch.</p> : null}
      <div className="flex flex-col gap-4 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </article>
  );
}
