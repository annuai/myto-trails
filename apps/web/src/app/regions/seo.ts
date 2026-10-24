import { isRegionIndexable } from "@moto-trails/domain";
import type { RegionDto } from "@/server/queries/types";

/** Thin region pages (fewer than three published trails) stay out of search results. */
export function regionMetadata(r: RegionDto): { title: string; description: string; robots: { index: boolean; follow: boolean } } {
  const n = r.publishedTrailCount;
  return {
    title: `Motorcycle trails in ${r.name}`,
    description: `${n} published motorcycle ${n === 1 ? "trail" : "trails"} in ${r.name}, with access, condition and verification for each.`,
    robots: { index: isRegionIndexable(n), follow: true },
  };
}
