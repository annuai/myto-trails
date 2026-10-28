# Web and API Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve public `/api/v1` reads, search and suggestions from cache so repeat traffic costs no function run or database query, staying inside Vercel Hobby, Supabase free and R2 free limits.

**Architecture:** The `/api/v1` dispatcher applies a per-route cache policy (CDN headers plus ETag and `304`) and marks every response to a token-bearing request `private, no-store`. Trail search gets a cached query-layer wrapper for non-"near me" searches. The mobile app's in-memory fetch cache learns a five-minute freshness window so screens stop refetching on every visit.

**Tech Stack:** Next.js 16 (`cacheComponents`, `"use cache"`), Vitest, Expo / React Native, zustand.

**Spec:** `docs/superpowers/specs/2026-10-28-web-caching-design.md`

## Global Constraints

- Staleness is acceptable up to one day, and **the worst case must stay within 24 hours**: `s-maxage` plus `stale-while-revalidate` must total at most 86400 seconds.
- No Redis and no new paid service or new dependency.
- A response to a request that carries a token is never public-cacheable: it is `private, no-store`.
- No CDN purge for `/api/v1`; the time-to-live is the invalidation. The existing `trails`, `trail:<slug>`, `region:<state>` tags stay as they are.
- Web pages keep querying the database directly; `/api/v1` stays the mobile app's API.
- Write routes and token-only routes are never cached at the CDN.

## Calls that differ from the spec (made while reading the code; flag them to the owner)

1. **`/api/suggest` stays where it is** and only gets the shared cache header. A CDN caches any `GET` with `s-maxage`, so moving it under `/api/v1` would only add a rate-limit database write per miss.
2. **`/api/nearby` stays as it is.** It is a `POST` (coordinates must not appear in URLs), so it is uncacheable by design.
3. **`/api/v1/trails/{slug}/gpx` stays uncached.** Its handler runs a per-address download limit that exists to slow scraping; a CDN hit would bypass it and the traffic is small.
4. **No in-flight request de-duplication.** The five-minute freshness window already removes the repeat calls it would have merged, and sharing a promise across components fights each caller's abort signal.
5. **No query-counter instrumentation.** Proof of benefit is the response headers (Task 6) and the Vercel and Supabase dashboards after deploy.
6. **The existing `cacheable()` helper** (bikes routes: `s-maxage=3600` plus `stale-while-revalidate=86400`, i.e. up to 25 hours) is replaced by the new policy so the 24-hour cap holds everywhere.

## Review Focus

- A request with a valid token to a `day` route must never receive a `public` header or an `ETag` (private data must not reach a shared cache). Pinned in Task 1.
- A `404` or other error on a cacheable route must never be stored publicly (an unknown slug cached for a day would hide a trail published an hour later). Pinned in Task 1.
- `If-None-Match` sent as a list or with weak validators (`W/"a", W/"b"`) must still produce `304`. Pinned in Task 1.
- "Near me" search must never go through the shared cache (it carries the rider's position). Pinned in Task 4.
- After sign-out, the next person on the same phone must not see the previous account's saved trails, clubs or profile from the in-memory cache. Pinned in Task 5.

---

### Task 1: Cache policy engine for the API dispatcher

**Files:**
- Create: `apps/web/src/server/api/cache.ts`
- Create: `apps/web/src/server/api/cache.test.ts`
- Modify: `apps/web/src/server/api/http.ts` (the `RouteDef` type, and the last line of `handle` that returns `route.handler(ctx)`)

**Interfaces:**
- Produces, in `cache.ts`:
  - `type CachePolicy = "day" | "none"`
  - `const PUBLIC_DAY_CACHE_CONTROL = "public, max-age=300, s-maxage=82800, stale-while-revalidate=3600"`
  - `applyCachePolicy(res: Response, o: { policy: CachePolicy; authed: boolean; ifNoneMatch: string | null }): Promise<Response>`
- Produces, in `http.ts`: `RouteDef.cache?: CachePolicy` (absent means `"none"`).
- Behaviour of `applyCachePolicy`: if `authed`, set `Cache-Control: private, no-store`, no `ETag`, return. If policy is `none`, return unchanged. If policy is `day` and `res.status === 200`, set `Cache-Control` to the constant and a weak `ETag` derived from the body; if `ifNoneMatch` lists that tag (comma separated, weak or strong), return a `304` with the same two headers and no body. Any other status is returned unchanged.

- [ ] **Step 1: Write the failing tests** in `cache.test.ts` (`// @vitest-environment node`). Test names and assertions:
  - `"day policy on a 200 sets the shared Cache-Control and an ETag"`: `Cache-Control` equals `PUBLIC_DAY_CACHE_CONTROL`; `ETag` starts with `W/"`.
  - `"worst case stays within 24 hours"`: parse `s-maxage` and `stale-while-revalidate` from the constant; their sum is `<= 86400`.
  - `"a matching If-None-Match gets 304 with no body"`, including when the header is `W/"nope", <the real tag>`.
  - `"a request with a token is private and has no ETag, even on a day route"`: `Cache-Control` is `private, no-store`; `ETag` is null.
  - `"errors are never stored publicly"`: a `404` response under policy `day` keeps `no-store` and has no `ETag`.
  - `"policy none leaves the response unchanged"`.
  - `"dispatch applies the policy"`: call `dispatch` (from `http.ts`) with one fake `GET` public route that has `cache: "day"`, and `deps.sql` stubbed as `(async () => [{ ok: true }]) as unknown as Sql` so the rate-limit call passes; expect `200` with the public header, then a second call with the returned `ETag` as `If-None-Match` expects `304`.
- [ ] **Step 2: Run to verify failure:** `cd apps/web && npx vitest run src/server/api/cache.test.ts`. Expected: fails (module `./cache` not found).
- [ ] **Step 3: Implement `cache.ts`** as specified above (hash the body text with `node:crypto` `createHash("sha1")`, base64url). Add `cache?: CachePolicy` to `RouteDef` with a one-line doc comment, and in `handle` replace `return await route.handler(ctx)` with `return await applyCachePolicy(await route.handler(ctx), { policy: route.cache ?? "none", authed: auth !== null, ifNoneMatch: req.headers.get("if-none-match") })`.
- [ ] **Step 4: Run to verify pass:** same command. Expected: all pass. Also run `cd apps/web && npx vitest run src/server/api` to confirm the existing CORS and community tests still pass.
- [ ] **Step 5: Commit** `feat(web): per-route cache policy for /api/v1 with ETag and private responses for tokens`

### Task 2: Declare a policy on every public route

**Files:**
- Modify: `apps/web/src/server/api/routes.ts` (the `cacheable` helper near the top; the `/openapi.json`, `/trails`, `/trails/{slug}`, `/trails/{slug}/route`, `/trails/{slug}/gpx`, `/bikes`, `/bikes/makes` entries)
- Modify: `apps/web/src/server/api/community-routes.ts` (the public `GET /trails/{slug}/comments` entry)
- Modify: `apps/web/src/server/api/cache.test.ts` (add the policy-table tests)

**Interfaces:**
- Consumes: `RouteDef.cache`, `CachePolicy` from Task 1.
- Produces: every `GET` route with `access: "public"` carries an explicit `cache`.

- [ ] **Step 1: Write the failing tests** in `cache.test.ts`, importing `routes` from `./routes` and `communityRoutes` if `routes` does not already include them (check `routes.ts`'s export): `"every public GET route declares a cache policy"` (`cache !== undefined` for each) and `"no route that needs a token is cached"` (any route whose `access !== "public"` has `cache !== "day"`), and `"the cached set is exactly trails, trail, route, bikes, makes, openapi"` asserting the sorted list of paths with `cache === "day"` equals `["/bikes", "/bikes/makes", "/openapi.json", "/trails", "/trails/{slug}", "/trails/{slug}/route"]`.
- [ ] **Step 2: Run to verify failure:** `cd apps/web && npx vitest run src/server/api/cache.test.ts`. Expected: the three new tests fail.
- [ ] **Step 3: Implement.** Set `cache: "day"` on the six paths above; set `cache: "none"` on `/trails/{slug}/gpx` and on public `GET /trails/{slug}/comments` (a one-line comment on each saying why: download limit, and per-user pending comments). Delete the `cacheable` helper and make the two bikes handlers return `ok(...)`.
- [ ] **Step 4: Run to verify pass:** `cd apps/web && npx vitest run src/server/api` and `cd apps/web && npx tsc --noEmit`. Expected: pass, no type errors.
- [ ] **Step 5: Commit** `feat(web): cache public API reads for up to a day`

### Task 3: Shared CDN header for `/api/suggest`

**Files:**
- Modify: `apps/web/src/app/api/suggest/route.ts`
- Create: `apps/web/src/app/api/suggest/route.test.ts`

**Interfaces:**
- Consumes: `PUBLIC_DAY_CACHE_CONTROL` from Task 1.

- [ ] **Step 1: Write the failing test** `"suggestions use the shared public cache header"`: mock `@/server/db/client` and `@/server/queries/search.sql` with `vi.mock` (`withPublicRole` calls its callback with `{}`, `suggest` resolves `{ places: [], trails: [] }` — match the real `Suggestions` shape from `search.sql.ts`), call `GET(new Request("http://x/api/suggest?q=goa"))`, and assert `Cache-Control` equals `PUBLIC_DAY_CACHE_CONTROL`; a second test asserts the `503` response keeps no public header.
- [ ] **Step 2: Run to verify failure:** `cd apps/web && npx vitest run src/app/api/suggest`. Expected: FAIL (header is `public, max-age=60`).
- [ ] **Step 3: Implement:** use `PUBLIC_DAY_CACHE_CONTROL` in the success response; the `503` keeps no `Cache-Control` override beyond what it has today (add `no-store`).
- [ ] **Step 4: Run to verify pass:** same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): suggestions are cached at the CDN`

### Task 4: Cache non-"near me" search in the query layer

**Files:**
- Modify: `apps/web/src/features/discovery/search-params.ts` (add the pure helper)
- Modify: `apps/web/src/features/discovery/search-params.test.ts` (or create it if absent; follow the existing test file for that module)
- Modify: `apps/web/src/server/queries/trails.ts` (two cached wrappers, beside the existing `"use cache"` functions)
- Modify: `apps/web/src/app/trails/page.tsx` (the two query calls)

**Interfaces:**
- Produces: `isShareableSearch(p: SearchParams): boolean` in `search-params.ts`, true unless `p.near === "me"`.
- Produces in `trails.ts`: `getCachedSearch(p: SearchParams): Promise<SearchResult>` and `getCachedMapPoints(p: SearchParams): Promise<MapPoint[]>` (types from `search.sql.ts`). Each is a `"use cache"` function with `cacheTag("trails")` and `cacheLife("hours")` that calls `withPublicRole(getSql(), ...)` and passes `new Date()` inside (never as an argument, so it is not part of the cache key). They take no `point`.

- [ ] **Step 1: Write the failing test** `"near me is never shareable; text, place and filter searches are"` with `parseSearchParams({ near: "me" })` → false; `{ near: "goa" }`, `{ q: "ladakh" }`, `{}` → true.
- [ ] **Step 2: Run to verify failure:** `cd apps/web && npx vitest run src/features/discovery`. Expected: FAIL (`isShareableSearch` not exported).
- [ ] **Step 3: Implement** the helper, the two wrappers, and in `page.tsx`: `const shared = isShareableSearch(params)`; use `getCachedSearch(params)` and `getCachedMapPoints(params)` when `shared`, otherwise keep the existing `withPublicRole(... { point })` calls. Leave `connection()` and the cookie read unchanged (decision 5 of the spec: the page still runs a function per visit).
- [ ] **Step 4: Run to verify pass:** `cd apps/web && npx vitest run src/features/discovery && npx tsc --noEmit`. Then `cd apps/web && npm run build` and confirm it succeeds with `/trails` still listed as dynamic.
- [ ] **Step 5: Commit** `feat(web): cache trail search results that do not use the rider's position`

### Task 5: Mobile in-memory cache gets a freshness window and clears on sign-out

**Files:**
- Create: `apps/mobile/src/api/cacheStore.ts`
- Create: `apps/mobile/src/api/cacheStore.test.ts`
- Modify: `apps/mobile/src/api/useApi.ts` (the `cache` map, `useFetch`, `setSaved`, `forgetComments`, `forgetProfile`)

**Interfaces:**
- Produces in `cacheStore.ts`: `FRESH_MS = 300_000`; `cacheGet<T>(key: string): { data: T; at: number } | undefined`; `cacheSet(key: string, data: unknown, now?: number): void`; `cacheDelete(key: string): void`; `cacheDeleteWhere(match: (key: string) => boolean): void`; `isFresh(key: string, now?: number): boolean`; `clearUserCache(): void` (removes `saved`, `me`, `clubs`, every key starting `club:` and every key ending `:in` that starts `comments:`).
- `useFetch` behaviour: on mount, if `isFresh(key)` show the cached data and make **no** network call; otherwise show cached data (if any) and refetch as today. `reload()` always refetches.

- [ ] **Step 1: Write the failing tests** (`cacheStore.test.ts`): `"an entry is fresh for five minutes and stale after"`; `"deleting an entry makes it not fresh"` (the post-edit case: `forgetComments` must still force a refetch); `"clearUserCache removes saved, me, clubs, club:* and signed-in comments but keeps trails, bikes and signed-out comments"`.
- [ ] **Step 2: Run to verify failure:** `cd apps/mobile && npx vitest run src/api/cacheStore.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement `cacheStore.ts`**, then switch `useApi.ts` to it: replace the local `cache` map and every `cache.get/set/delete` and the two key loops (`forgetComments`, `forgetProfile`) with the store functions; add the freshness skip and a `reload` that bypasses it (a ref flag set by `reload`). Add at module level `useAuth.subscribe((s, prev) => { if (prev.token && !s.token) clearUserCache(); })`.
- [ ] **Step 4: Run to verify pass:** `cd apps/mobile && npx vitest run src/api && npx tsc --noEmit`. Expected: pass, no type errors.
- [ ] **Step 5: Commit** `feat(mobile): screens reuse results for five minutes; per-user cache clears on sign-out`

### Task 6: Verify end to end and record the result

**Files:** none changed (an `ARCHITECTURE.md` note only if the owner asks).

- [ ] **Step 1:** `npm test` at the repo root. Expected: all workspaces pass.
- [ ] **Step 2:** `cd apps/web && npm run build && npm start` against the Supabase-backed `.env.local` (not the local Postgres). With `curl -s -D - -o /dev/null http://localhost:3000/api/v1/trails`, expect `Cache-Control: public, max-age=300, s-maxage=82800, stale-while-revalidate=3600` and an `ETag`; repeat with `-H 'If-None-Match: <that tag>'` and expect `HTTP/1.1 304`.
- [ ] **Step 3:** The same request with `-H 'Authorization: Bearer invalid'` returns `401` with `no-store`; with a real device token on `/api/v1/trails` expect `private, no-store` and no `ETag`. `/api/v1/trails/<any-slug>/comments` and `/gpx` expect `no-store`.
- [ ] **Step 4:** After deploying, compare function invocations (Vercel) and database queries and egress (Supabase) for the same browse before and after; report the numbers or say they were not measured.
