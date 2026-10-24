import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { buildRobots } from "./sitemap-data";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(getSiteUrl(process.env));
}
