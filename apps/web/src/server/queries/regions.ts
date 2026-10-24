import { isValidSlug } from "@moto-trails/domain";
import { cacheLife, cacheTag } from "next/cache";
import { getSql, withPublicRole } from "../db/client";
import { queryDistricts, queryRegionBySlugs, queryRegionsForHub } from "./regions.sql";
import type { RegionDto } from "./types";

async function loadRegion(stateSlug: string, districtSlug: string | undefined): Promise<RegionDto | null> {
  "use cache";
  cacheTag("trails", `region:${stateSlug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryRegionBySlugs(tx, stateSlug, districtSlug));
}

export async function getRegion(stateSlug: string, districtSlug?: string): Promise<RegionDto | null> {
  if (!isValidSlug(stateSlug) || (districtSlug !== undefined && !isValidSlug(districtSlug))) return null;
  return loadRegion(stateSlug, districtSlug);
}

async function loadDistricts(stateSlug: string): Promise<RegionDto[]> {
  "use cache";
  cacheTag("trails", `region:${stateSlug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryDistricts(tx, stateSlug));
}

export async function getDistricts(stateSlug: string): Promise<RegionDto[]> {
  return isValidSlug(stateSlug) ? loadDistricts(stateSlug) : [];
}

export async function getRegionsForHub(): Promise<RegionDto[]> {
  "use cache";
  cacheTag("trails");
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryRegionsForHub(tx));
}
