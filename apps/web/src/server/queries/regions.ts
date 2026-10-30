import { isValidSlug } from "@moto-trails/domain";
import { cacheLife, cacheTag } from "next/cache";
import { getSql, withPublicRole } from "../db/client";
import { queryDistricts, queryRegionBySlugs, queryRegionsForHub } from "./regions.sql";
import type { RegionDto } from "./types";

async function loadRegion(countrySlug: string, stateSlug: string, districtSlug: string | undefined): Promise<RegionDto | null> {
  "use cache";
  cacheTag("trails", `region:${countrySlug}:${stateSlug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryRegionBySlugs(tx, countrySlug, stateSlug, districtSlug));
}

export async function getRegion(countrySlug: string, stateSlug: string, districtSlug?: string): Promise<RegionDto | null> {
  if (!isValidSlug(countrySlug) || !isValidSlug(stateSlug) || (districtSlug !== undefined && !isValidSlug(districtSlug))) return null;
  return loadRegion(countrySlug, stateSlug, districtSlug);
}

async function loadDistricts(countrySlug: string, stateSlug: string): Promise<RegionDto[]> {
  "use cache";
  cacheTag("trails", `region:${countrySlug}:${stateSlug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryDistricts(tx, countrySlug, stateSlug));
}

export async function getDistricts(countrySlug: string, stateSlug: string): Promise<RegionDto[]> {
  return isValidSlug(countrySlug) && isValidSlug(stateSlug) ? loadDistricts(countrySlug, stateSlug) : [];
}

export async function getRegionsForHub(): Promise<RegionDto[]> {
  "use cache";
  cacheTag("trails");
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryRegionsForHub(tx));
}
