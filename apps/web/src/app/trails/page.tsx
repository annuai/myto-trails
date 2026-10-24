import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { ActiveFilterList } from "@/features/discovery/ActiveFilterList";
import { FilterPanel } from "@/features/discovery/FilterPanel";
import { NearMeButton } from "@/features/discovery/NearMeButton";
import { Pagination } from "@/features/discovery/Pagination";
import { RadiusChips } from "@/features/discovery/RadiusChips";
import { SearchCombobox } from "@/features/discovery/SearchCombobox";
import { SearchResultCard } from "@/features/discovery/SearchResultCard";
import { SortLinks } from "@/features/discovery/SortLinks";
import { ViewToggle } from "@/features/discovery/ViewToggle";
import { parseSearchParams, toSearchString } from "@/features/discovery/search-params";
import { NEAR_COOKIE, parseNearCookie } from "@/lib/near-cookie";
import { getSql, withPublicRole } from "@/server/db/client";
import { TrailMapLoader } from "@/features/map/TrailMapLoader";
import { searchMapPoints, searchTrails } from "@/server/queries/search.sql";

// Search is uncached and depends on the URL (and, for "near me", a cookie), so this route renders on demand.
export const instant = false;

export async function generateMetadata({ searchParams }: PageProps<"/trails">): Promise<Metadata> {
  const params = parseSearchParams(await searchParams);
  const filtered = toSearchString({ ...params, view: "list" }) !== "";
  return {
    title: "Explore trails",
    description: "Search motorcycle trails in India by place, terrain, difficulty and access.",
    alternates: { canonical: "/trails" },
    // Filtered and paged views are for people, not for search results pages.
    robots: filtered || params.view === "map" ? { index: false, follow: true } : undefined,
  };
}

export default async function TrailsPage({ searchParams }: PageProps<"/trails">) {
  const params = parseSearchParams(await searchParams);
  const point = parseNearCookie((await cookies()).get(NEAR_COOKIE)?.value);
  await connection(); // the clock is request-specific: opt into request time before reading it
  const result = await withPublicRole(getSql(), (tx) => searchTrails(tx, params, new Date(), { point }));
  const mapPoints = params.view === "map" ? await withPublicRole(getSql(), (tx) => searchMapPoints(tx, params, { point })) : [];
  const placeName = result.origin?.kind === "place" ? result.origin.name : undefined;
  const needsLocation = params.near === "me" && result.origin === null;

  return (
    <div className="flex flex-col gap-6 py-8">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-3xl leading-tight">Explore trails</h1>
        <SearchCombobox initialQuery={params.q} />
        <NearMeButton href={`/trails?${toSearchString({ ...params, near: "me", page: 1 })}`} />
      </header>

      <FilterPanel params={params} />
      <ActiveFilterList params={params} placeName={placeName} />
      {params.near ? <RadiusChips params={params} /> : null}

      {needsLocation ? (
        <p role="status" className="max-w-prose text-muted">Share your location to see trails near you, or search for a place above.</p>
      ) : result.unknownPlace ? (
        <p role="status" className="max-w-prose text-muted">We don&apos;t know that place. Search for a nearby town or city instead.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-6 border-b border-border">
            <p aria-live="polite" className="py-3 text-sm">
              {result.total === 0 ? "No trails found" : `${result.total} ${result.total === 1 ? "trail" : "trails"}`}
              {placeName ? ` within ${params.radius} km of ${placeName}` : ""}
            </p>
            <ViewToggle params={params} />
          </div>
          <SortLinks params={params} />
          {params.view === "map" ? <TrailMapLoader points={mapPoints} /> : null}

          {result.items.length === 0 ? (
            <div className="max-w-prose py-6">
              <p className="font-medium">Nothing matches those filters.</p>
              <p className="mt-2 text-muted">Try removing a filter above, widening the radius, or including closed trails.</p>
              <Link href="/regions" className="mt-4 inline-flex min-h-11 items-center underline underline-offset-4">Browse by region</Link>
            </div>
          ) : (
            <div id="results" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((t) => (
                <SearchResultCard key={t.slug} trail={t} />
              ))}
            </div>
          )}
          <Pagination params={params} total={result.total} />
        </>
      )}
    </div>
  );
}
