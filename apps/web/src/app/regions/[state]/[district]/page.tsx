import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrailCard } from "@/features/discovery/TrailCard";
import { Breadcrumbs } from "@/ui/Breadcrumbs/Breadcrumbs";
import { getRegion } from "@/server/queries/regions";
import { getTrailsInRegion } from "@/server/queries/trails";
import { regionMetadata } from "../../seo";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/regions/[state]/[district]">): Promise<Metadata> {
  const { state, district } = await params;
  const region = await getRegion(state, district);
  return region ? regionMetadata(region) : {};
}

export default async function DistrictPage({ params }: PageProps<"/regions/[state]/[district]">) {
  const { state, district } = await params;
  const [stateRegion, region] = await Promise.all([getRegion(state), getRegion(state, district)]);
  if (!stateRegion || !region) notFound();
  const trails = await getTrailsInRegion(state, district);

  return (
    <div className="flex flex-col gap-10 py-8">
      <header className="flex flex-col gap-3">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Regions", href: "/regions" },
            { label: stateRegion.name, href: `/regions/${state}` },
            { label: region.name },
          ]}
        />
        <h1 className="font-display text-3xl leading-tight">{region.name}</h1>
        <p className="text-muted">{region.publishedTrailCount} {region.publishedTrailCount === 1 ? "trail" : "trails"} in {stateRegion.name}</p>
      </header>
      <section aria-labelledby="trails">
        <h2 id="trails" className="text-xl font-semibold">Trails</h2>
        {trails.length === 0 ? (
          <p className="mt-4 max-w-prose text-muted">No trails have been published in {region.name} yet.</p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trails.map((t) => (
              <TrailCard key={t.slug} trail={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
