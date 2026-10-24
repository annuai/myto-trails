import Link from "next/link";
import type { ReactNode } from "react";

/** A home page section with a heading, an optional intro and a "see all" link. */
export function Section({ id, eyebrow, title, intro, href, hrefLabel, children }: { id: string; eyebrow?: string; title: string; intro?: string; href?: string; hrefLabel?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="max-w-2xl">
          {eyebrow ? <span className="eyebrow mb-3 block">{eyebrow}</span> : null}
          <h2 id={id} className="display-md">{title}</h2>
          {intro ? <p className="mt-2 text-muted">{intro}</p> : null}
        </div>
        {href ? <Link href={href} className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{hrefLabel ?? "See all"}</Link> : null}
      </div>
      {children}
    </section>
  );
}
