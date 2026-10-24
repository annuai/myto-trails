import { isValidSlug } from "@moto-trails/domain";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getSql, withPublicRole } from "../db/client";
import { applyNow } from "./effective";
import { parseSearchParams } from "@/features/discovery/search-params";
import { searchTrails, type SearchItem } from "./search.sql";
import { queryTrailBySlug, queryTrailMedia, queryTrailRoute, queryTrailVideos, queryTrailsInRegion, querySitemapEntries } from "./trails.sql";
import type { MediaDto, RouteDto, VideoDto, TrailDetailDto, TrailSummaryDto } from "./types";

// Cached wrappers used by pages. Slugs are validated before any cache entry or tag is created, so hostile
// URLs never reach the cache or the database. Invalidate with revalidateTag("trails") or ("trail:<slug>").
// The cache holds stored values; "effective" condition and verification are recomputed with the current time
// on every request (applyNow), so an expiry is never frozen into a cached page.

async function loadTrail(slug: string): Promise<TrailDetailDto | null> {
  "use cache";
  cacheTag("trails", `trail:${slug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryTrailBySlug(tx, slug, new Date()));
}

export async function getTrail(slug: string): Promise<TrailDetailDto | null> {
  if (!isValidSlug(slug)) return null;
  const trail = await loadTrail(slug);
  // The current time is request-specific; opt into request-time rendering before reading it.
  await connection();
  return trail ? applyNow(trail, new Date()) : null;
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

async function loadTrailVideos(slug: string): Promise<VideoDto[]> {
  "use cache";
  cacheTag("trails", `trail:${slug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryTrailVideos(tx, slug));
}

export async function getTrailVideos(slug: string): Promise<VideoDto[]> {
  return isValidSlug(slug) ? loadTrailVideos(slug) : [];
}

async function loadTrailRoute(slug: string): Promise<RouteDto | null> {
  "use cache";
  cacheTag("trails", `trail:${slug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryTrailRoute(tx, slug));
}

export async function getTrailRoute(slug: string): Promise<RouteDto | null> {
  return isValidSlug(slug) ? loadTrailRoute(slug) : null;
}

async function loadTrailsInRegion(stateSlug: string, districtSlug: string | undefined): Promise<TrailSummaryDto[]> {
  "use cache";
  cacheTag("trails", `region:${stateSlug}`);
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => queryTrailsInRegion(tx, { stateSlug, districtSlug }, new Date()));
}

export async function getTrailsInRegion(stateSlug: string, districtSlug?: string): Promise<TrailSummaryDto[]> {
  if (!isValidSlug(stateSlug) || (districtSlug !== undefined && !isValidSlug(districtSlug))) return [];
  const trails = await loadTrailsInRegion(stateSlug, districtSlug);
  await connection();
  const now = new Date();
  return trails.map((t) => applyNow(t, now));
}

export async function getSitemapEntries(): Promise<{ trails: { slug: string; updatedAt: string }[]; regions: { path: string }[] }> {
  "use cache";
  cacheTag("trails");
  cacheLife("hours");
  return withPublicRole(getSql(), (tx) => querySitemapEntries(tx, { excludeSample: process.env.NODE_ENV === "production" }));
}

async function loadFeatured(): Promise<SearchItem[]> {
  "use cache";
  cacheTag("trails");
  cacheLife("hours");
  const r = await withPublicRole(getSql(), (tx) => searchTrails(tx, parseSearchParams({ sort: "recent" }), new Date()));
  return r.items.slice(0, 6);
}

/** The newest open trails for the home page; effective status is recomputed on every request. */
export async function getFeaturedTrails(): Promise<SearchItem[]> {
  const items = await loadFeatured();
  await connection();
  const now = new Date();
  return items.map((t) => applyNow(t, now));
}
