import { isValidSlug } from "@moto-trails/domain";
import { cacheLife, cacheTag } from "next/cache";
import { getSql, withPublicRole } from "../db/client";
import { queryTrailBySlug, queryTrailMedia, queryTrailsInRegion, querySitemapEntries } from "./trails.sql";
import type { MediaDto, TrailDetailDto, TrailSummaryDto } from "./types";

// Cached wrappers used by pages. Slugs are validated before any cache entry or tag is created, so hostile
// URLs never reach the cache or the database. Invalidate with revalidateTag("trails") or ("trail:<slug>").

async function loadTrail(slug: string): Promise<TrailDetailDto | null> {
  "use cache";
  cacheTag("trails", `trail:${slug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryTrailBySlug(tx, slug, new Date()));
}

export async function getTrail(slug: string): Promise<TrailDetailDto | null> {
  return isValidSlug(slug) ? loadTrail(slug) : null;
}

async function loadTrailMedia(slug: string): Promise<MediaDto[]> {
  "use cache";
  cacheTag("trails", `trail:${slug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryTrailMedia(tx, slug));
}

export async function getTrailMedia(slug: string): Promise<MediaDto[]> {
  return isValidSlug(slug) ? loadTrailMedia(slug) : [];
}

async function loadTrailsInRegion(stateSlug: string, districtSlug: string | undefined): Promise<TrailSummaryDto[]> {
  "use cache";
  cacheTag("trails", `region:${stateSlug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryTrailsInRegion(tx, { stateSlug, districtSlug }, new Date()));
}

export async function getTrailsInRegion(stateSlug: string, districtSlug?: string): Promise<TrailSummaryDto[]> {
  if (!isValidSlug(stateSlug) || (districtSlug !== undefined && !isValidSlug(districtSlug))) return [];
  return loadTrailsInRegion(stateSlug, districtSlug);
}

export async function getSitemapEntries(): Promise<{ trails: { slug: string; updatedAt: string }[]; regions: { path: string }[] }> {
  "use cache";
  cacheTag("trails");
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => querySitemapEntries(tx, { excludeSample: process.env.NODE_ENV === "production" }));
}
