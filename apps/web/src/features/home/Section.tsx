import Link from "next/link";
import type { ReactNode } from "react";

/** A home page section with a heading, an optional intro and a "see all" link. */
export function Section({ id, title, intro, href, hrefLabel, children }: { id: string; title: string; intro?: string; href?: string; hrefLabel?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="max-w-2xl">
          <h2 id={id} className="text-2xl font-semibold leading-tight sm:text-3xl">{title}</h2>
          {intro ? <p className="mt-2 text-muted">{intro}</p> : null}
        </div>
        {href ? <Link href={href} className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{hrefLabel ?? "See all"}</Link> : null}
      </div>
      {children}
    </section>
  );
}
