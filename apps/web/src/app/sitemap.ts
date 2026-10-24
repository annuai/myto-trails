import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { getSitemapEntries } from "@/server/queries/trails";
import { buildSitemap } from "./sitemap-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(await getSitemapEntries(), getSiteUrl(process.env));
}
