import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/ui/Breadcrumbs/Breadcrumbs";
import { getRegionsForHub } from "@/server/queries/regions";

export const metadata: Metadata = { title: "Regions", description: "Browse motorcycle trails by state." };

export default async function RegionsPage() {
  const states = await getRegionsForHub();
  return (
    <div className="flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-3">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Regions" }]} />
        <h1 className="font-display text-3xl leading-tight">Regions</h1>
      </header>
      {states.length === 0 ? (
        <p className="max-w-prose text-muted">No trails have been published yet.</p>
      ) : (
        <ul className="border-t border-border">
          {states.map((s) => (
            <li key={`${s.countrySlug}-${s.slug}`} className="flex items-baseline justify-between border-b border-border">
              <Link href={`/regions/${s.countrySlug ?? "india"}/${s.slug}`} className="inline-flex min-h-11 items-center py-3 text-lg font-semibold underline-offset-4 hover:underline">
                {s.name}
              </Link>
              <span className="font-mono text-sm text-muted">{s.publishedTrailCount} {s.publishedTrailCount === 1 ? "trail" : "trails"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
