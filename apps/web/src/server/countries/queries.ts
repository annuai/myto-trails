import { cacheLife, cacheTag } from "next/cache";
import { getSql, withPublicRole } from "../db/client";
import { listCountries, type CountryDto } from "./countries";

/** Every country the app knows, open or coming soon. Cached for a while: countries change rarely. */
export async function getCountries(): Promise<CountryDto[]> {
  "use cache";
  cacheTag("countries");
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => listCountries(tx));
}

export async function getCountryBySlug(slug: string): Promise<CountryDto | null> {
  return (await getCountries()).find((c) => c.slug === slug) ?? null;
}
