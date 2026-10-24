import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrailRow } from "@/features/discovery/TrailRow";
import { Breadcrumbs } from "@/ui/Breadcrumbs/Breadcrumbs";
import { getDistricts, getRegion } from "@/server/queries/regions";
import { getTrailsInRegion } from "@/server/queries/trails";
import { regionMetadata } from "../seo";

// Region data is cached with "use cache"; awaiting params makes the route render on demand with a real 404.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/regions/[state]">): Promise<Metadata> {
  const { state } = await params;
  const region = await getRegion(state);
  return region ? regionMetadata(region) : {};
}

export default async function StatePage({ params }: PageProps<"/regions/[state]">) {
  const { state } = await params;
  const region = await getRegion(state);
  if (!region) notFound();
  const [districts, trails] = await Promise.all([getDistricts(state), getTrailsInRegion(state)]);
  const withTrails = districts.filter((d) => d.publishedTrailCount > 0);

  return (
    <div className="flex flex-col gap-10 py-8">
      <header className="flex flex-col gap-3">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Regions", href: "/regions" }, { label: region.name }]} />
        <h1 className="font-display text-3xl leading-tight">{region.name}</h1>
        <p className="text-muted">{region.publishedTrailCount} {region.publishedTrailCount === 1 ? "trail" : "trails"}</p>
      </header>

      {withTrails.length > 0 ? (
        <section aria-labelledby="districts">
          <h2 id="districts" className="text-xl font-semibold">Districts</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
            {withTrails.map((d) => (
              <li key={d.slug}>
                <Link href={`/regions/${state}/${d.slug}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
                  {d.name} <span className="ml-2 font-mono text-sm text-muted">{d.publishedTrailCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="trails">
        <h2 id="trails" className="text-xl font-semibold">Trails</h2>
        {trails.length === 0 ? (
          <p className="mt-4 max-w-prose text-muted">No trails have been published in {region.name} yet.</p>
        ) : (
          <div className="mt-2 border-t border-border">
            {trails.map((t) => (
              <TrailRow key={t.slug} trail={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
