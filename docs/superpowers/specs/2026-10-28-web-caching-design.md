# Caching for the web app and `/api/v1` — design

## Why

Moto Trails runs on free tiers (Vercel Hobby, Supabase free, Cloudflare R2) and the owner does not want to pay for any of them while development continues. The limits that matter are serverless function invocations, Supabase database reads and egress, and (on Hobby) the service stopping rather than billing when a limit is hit. The goal is **fewer function runs and fewer database queries**, with no new paid service.

## What exists today (checked in the code)

- Server-rendered web pages query Postgres directly through `src/server/queries/*`. Trail detail and region queries are already cached with `"use cache"`, `cacheLife("hours")` and tags (`trails`, `trail:<slug>`, `region:<state>`). `cacheComponents` is on.
- `/api/v1/[[...path]]` (used by the mobile app) answers **every** response with `Cache-Control: no-store`, including public reads (trails, trail detail, route, bikes, makes, public trail comments). Public requests also run a `rate_limit_hit` database write first.
- `/trails` search renders on every request (reads the near-me cookie, calls `connection()`), so nothing is shared between visitors.
- `/api/nearby` and the GPX download are `no-store`. `/api/suggest` sends `public, max-age=60` (browser only, no CDN lifetime).
- R2 objects served through `/api/storage/public/*` already get `public, max-age=31536000, immutable`.

## Decisions (the owner's)

- **Staleness up to one day is acceptable everywhere**, including trail takedowns. This is also stated in the Terms (see the legal design).
- No Redis or any other new paid service.
- Aim: stay inside free limits.

## Decisions (my calls, to be checked)

1. **Web pages keep querying the database directly.** `/api/v1` stays the mobile app's API. Routing server-rendered pages through it adds a second function invocation on every miss, and trail and region pages are already cached.
2. **`/api/suggest` and `/api/nearby` move under `/api/v1`** (public routes), so there is one cacheable API surface. The old paths can stay as thin aliases until the web client is switched.
3. **Authenticated responses are never shared-cached, and the CDN is not relied on to tell requests apart.** Any response to a request carrying a token gets `Cache-Control: private, no-store` (the origin decides, so this does not depend on how the CDN treats `Vary`). The CDN-cached entries therefore only ever contain public, tokenless output. The mobile `api()` helper only sends the token when the caller passes one, so public reads (trails, bikes) are called without it and can hit the cache even for signed-in users.
4. **Trail comments are not CDN-cached.** Their output differs with a token (the caller's own pending comments), and they are the most likely thing to change, so they stay `no-store` (client cache only).
5. **Near-me and cookie-dependent search stays uncached at the page level.** The web `/trails` page reads a cookie and calls `connection()`, so every visit runs a function. The cache goes in the query functions (saves database reads, not invocations); restructuring the page so near-me is a dynamic island is a possible later step, to be decided after measuring. `/api/v1/trails` reads no cookies, only query parameters, so it is safe to cache by URL.
6. **No CDN purge.** The time-to-live is the invalidation mechanism for `/api/v1`. Tag invalidation of the web's `"use cache"` data stays as it is.
7. **`/api/suggest` and `/api/nearby` are called only by the web** (the mobile app does not use them, checked in the code), so they can be moved under `/api/v1` and the web client switched in the same change, with the old paths removed. `nearby` stays uncached because it depends on the rider's position.
8. **Measuring:** Vercel and Supabase dashboards, plus a test-only query counter for the scripted browse. There is no numeric target; the proof is that cached hits cause zero function runs and zero queries.

## Design

### 1. HTTP caching on public `/api/v1` reads
Add a cache policy per route in the route table (next to `access`), e.g. `cache: "static-day"`. For public `GET`s: `Cache-Control: public, max-age=300, s-maxage=82800, stale-while-revalidate=3600`. The short `max-age` keeps the app from re-asking within five minutes; `s-maxage` lets Vercel's CDN answer for 23 hours without running a function. The stale-while-revalidate window is deliberately one hour, so the worst case is **24 hours in total** (not two days, which is what a day plus a day would give), matching what the Terms promise. Add a weak `ETag` (hash of the body) and honour `If-None-Match` with `304`, so a revalidation costs almost nothing.
Because the CDN answers before the handler runs, **cached hits skip the rate-limit database write**; it happens only on misses.
Routes covered: `/trails`, `/trails/{slug}`, `/trails/{slug}/route`, `/trails/{slug}/gpx`, `/bikes`, `/bikes/makes`, `/openapi.json`, and the moved suggest. Trail comments and nearby are not covered (see decisions 4 and 7).
Everything else stays `no-store`.

### 2. Server-side caching of search
Cache `searchTrails` and `searchMapPoints` results keyed by the normalised filter set, using the existing `"use cache"` mechanism with `cacheTag("trails")` and a life under a day, for requests with no near-me cookie and no `near=me`. Near-me stays on the current uncached path. The page itself still runs a function per visit (decision 5).

### 3. Client-side cache (web browser components and the mobile app)
Short-lived in-memory cache with in-flight request de-duplication and stale-while-revalidate for public reads, in the mobile `useApi` layer and the web client components that call APIs (`SearchCombobox`, `NearbyTrails`). The owner's choice of library is left to the builder; a small hand-written helper is preferred over a new dependency unless an existing dependency already does this. Per-user data is cached in memory only and cleared on sign-out.

### 4. Invalidation
Keep the existing `trails`, `trail:<slug>` and `region:<state>` tags and clear them when a moderator publishes, edits or unpublishes (this covers the website's own pages). The `/api/v1` CDN copies rely on the time-to-live alone, which the owner accepts; there is no purge.

### 5. R2 and media
No change needed beyond confirming that every public media URL goes through the immutable-cache route.

## Goals
- Public reads (web and app) are served from cache for a day without a function run or database query on a hit.
- Measurably fewer invocations and database queries for the same traffic.

## Non-goals
- No Redis, no cache warming, no caching of write routes, no offline mode.
- No change to who can see what.

## Anti-goals (failure even if it "works")
- A private response (saved trails, clubs, phone-number requests, own pending comments, contact data) ever served to someone else.
- Cache that cannot be bypassed for debugging or tests.
- Added dependencies or services that cost money.

## Verification expected
Tests for the cache-policy table (every public route has an explicit policy; no token-bearing response is `public`), `304` handling, `Vary`, the bypass for token requests, and search-key normalisation. A before/after count of function invocations and database queries for a scripted browse (home, search, trail detail, back) is the proof of benefit.

## Left to the builder
The ETag hashing method, whether the client cache is hand-written or uses an existing library (check what the app and web already depend on first), and file layout. TTLs may be shorter than the numbers above but the worst case must stay within 24 hours.
