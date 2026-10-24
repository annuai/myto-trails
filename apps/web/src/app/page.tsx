import { Suspense } from "react";
import { AccessExplainer } from "@/features/home/AccessExplainer";
import { ContributeBand } from "@/features/home/ContributeBand";
import { Hero } from "@/features/home/Hero";
import { RegionTiles } from "@/features/home/RegionTiles";
import { Section } from "@/features/home/Section";
import { NearbyTrails } from "@/features/discovery/NearbyTrails";
import { SearchResultCard } from "@/features/discovery/SearchResultCard";
import { getRegionsForHub } from "@/server/queries/regions";
import { getFeaturedTrails } from "@/server/queries/trails";

export const instant = false;

async function Featured() {
  const trails = await getFeaturedTrails();
  if (trails.length === 0) return <p className="text-muted">Trails will appear here as they are published.</p>;
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {trails.map((t) => (
        <li key={t.slug}><SearchResultCard trail={t} /></li>
      ))}
    </ul>
  );
}

async function Regions() {
  return <RegionTiles regions={await getRegionsForHub()} />;
}

export default function Home() {
  return (
    <>
      <Hero imageSrc="/placeholders/hero-2400.webp" />
      <Section id="nearby" title="Trails near you" intro="Allow your location to see the closest trails and roughly how long each takes to reach.">
        <NearbyTrails />
      </Section>
      <Section id="new" title="Recently added" href="/trails" hrefLabel="See all trails">
        <Suspense fallback={<p className="text-muted">Loading trails…</p>}>
          <Featured />
        </Suspense>
      </Section>
      <Section id="regions" title="Browse by region" href="/regions" hrefLabel="All regions">
        <Suspense fallback={null}>
          <Regions />
        </Suspense>
      </Section>
      <Section id="access" title="Access comes first" intro="A trail is only useful if you are allowed to ride it. Every listing says which of these it is.">
        <AccessExplainer />
      </Section>
      <ContributeBand />
    </>
  );
}
