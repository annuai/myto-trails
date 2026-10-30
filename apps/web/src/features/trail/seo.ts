import type { Metadata } from "next";
import type { TrailDetailDto } from "@/server/queries/types";

const MAX_DESCRIPTION = 160;

function truncate(text: string): string {
  if (text.length <= MAX_DESCRIPTION) return text;
  const cut = text.slice(0, MAX_DESCRIPTION - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function trailMetadata(trail: TrailDetailDto, siteUrl: string): Metadata {
  const url = `${siteUrl}/trails/${trail.slug}`;
  const place = [trail.district?.name, trail.state.name].filter(Boolean).join(", ");
  const title = `${trail.name} · ${place}`;
  const description = truncate(trail.summary);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article", siteName: "Moto Trails" },
    // Sample data must never be indexed.
    ...(trail.isSample ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Structured data: only the public location is used, so a sensitive trail never reveals its exact start. */
export function trailJsonLd(trail: TrailDetailDto, siteUrl: string): object {
  const url = `${siteUrl}/trails/${trail.slug}`;
  const crumbs = [
    { name: "Home", item: siteUrl },
    { name: "Regions", item: `${siteUrl}/regions` },
    { name: trail.state.name, item: `${siteUrl}/regions/${trail.country?.slug ?? "india"}/${trail.state.slug}` },
    ...(trail.district ? [{ name: trail.district.name, item: `${siteUrl}/regions/${trail.country?.slug ?? "india"}/${trail.state.slug}/${trail.district.slug}` }] : []),
    { name: trail.name, item: url },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        "@id": `${url}#place`,
        name: trail.name,
        description: trail.summary,
        url,
        address: {
          "@type": "PostalAddress",
          addressLocality: trail.nearestTown,
          addressRegion: trail.state.name,
          addressCountry: trail.country?.iso2 ?? "IN",
        },
        ...(trail.location
          ? { geo: { "@type": "GeoCoordinates", latitude: trail.location.lat, longitude: trail.location.lon } }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
      },
    ],
  };
}

/** JSON for a <script type="application/ld+json"> tag: "<" is escaped so content can never close the tag. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
