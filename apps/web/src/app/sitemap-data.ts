import type { MetadataRoute } from "next";

type Entries = { trails: { slug: string; updatedAt: string }[]; regions: { path: string }[] };

export function buildSitemap(entries: Entries, siteUrl: string): MetadataRoute.Sitemap {
  return [
    { url: siteUrl },
    { url: `${siteUrl}/regions` },
    ...entries.regions.map((r) => ({ url: `${siteUrl}${r.path}` })),
    ...entries.trails.map((t) => ({ url: `${siteUrl}/trails/${t.slug}`, lastModified: new Date(t.updatedAt) })),
  ];
}

export function buildRobots(siteUrl: string): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/design", "/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
