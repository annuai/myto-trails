# M0 foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Moto Trails monorepo with shared design tokens, a deployable web shell (header, footer with the subsidiary statement, health check, design-system page), validated environment configuration, and a **switchable object-storage layer** (Cloudflare R2 or Supabase Storage, plus an in-memory provider for local work and tests).

**Architecture:** npm-workspaces monorepo: `packages/tokens` (CSS tokens), `packages/domain` (pure TypeScript enums and limits), `apps/web` (Next.js App Router). Storage is a `StorageProvider` interface in `apps/web/src/server/storage/` with three implementations chosen at startup by `STORAGE_PROVIDER`; no feature code imports a vendor SDK. Everything is test-first; live-provider tests are opt-in.

**Tech Stack:** Node ≥ 22 (local: 26.8.2), npm workspaces, TypeScript, Next.js (App Router, latest stable at execution time), Tailwind CSS v4, Vitest, Testing Library, Zod, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2), `@supabase/supabase-js`, GitHub Actions.

**Spec:** `docs/05-technical-architecture.md` (§1 domain, §2 stack, §9 media), `docs/09-design-system.md` (tokens, StatusBadge), `docs/10-component-architecture.md` (layout), `docs/12-implementation-roadmap.md` (M0), `docs/13-risks-and-open-decisions.md` (D-1, D-6). Roadmap M0 items "ADRs, empty app deployed, tokens package, design-system page skeleton" and the storage adapter (pulled forward from M4 at the user's request) are in scope. Accounts, domain purchase, legal and Navi items are **out of scope** (marked waiting on the user).

## Global Constraints

- Repo: `https://github.com/annuai/myto-trails.git`, branch `main`; work is in `/Users/annuaip/Downloads/mototrails` (docs already there).
- Package scope `@moto-trails/*`; workspaces `apps/*`, `packages/*`. Use npm (pnpm is not installed).
- Shared Myto token values verbatim: background `#f2ede8`, surface `#f2f0ec`, foreground `#1a1a1a`, muted `#6b6560`, border `#00000014`, brand red `#be3a23`, dark `#1c1c1a`, clay `#ddd4c8`, olive `#d8dbc9`, sand `#ddd7ca`, stone `#e3ddd4`; fonts Geist (sans) and Michroma (display, only wordmark and page titles); spacing base `0.25rem`; easing `cubic-bezier(.4, 0, .2, 1)`.
- Trails layer: accent `#1f4a6b`, accent-hover `#173a55`, accent-subtle `#e3ebf1`; status good `#2d6a3e`, caution `#8a5a00`, stop `#a32d1c`, unknown `#6b6560`, info `#2a5f8a`; dark-theme counterparts good `#6fbf83`, caution `#e0a43a`, stop `#ec8272`, unknown `#a8a29b`, info `#7fb2d6`; radii `0 / 2px / 4px`; section gap 64px desktop, 48px mobile.
- No hard-coded hex colours outside `packages/tokens`. Sentence-case UI text, no uppercase transforms. WCAG 2.2 AA: text contrast ≥ 4.5:1, visible 2px focus ring in accent, 44px minimum touch targets.
- Canonical host config `SITE_URL`; production value `https://moto-trails.com`; development default `http://localhost:3000`.
- Upload limits (doc 05 §8–9): GPX 5 MB, image 10 MB; object keys use UUIDs, never user filenames.
- Secrets only in `.env.local` / Vercel env; never committed, printed or logged. `NEXT_PUBLIC_*` vars never hold secrets.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Hostile or malformed object keys** (`../x`, leading `/`, backslashes, control chars, 300-char names, non-UUID owner ids): rejected before any provider call. Test in Task 6.
2. **Provider misconfigured** (`STORAGE_PROVIDER=r2` with R2 variables missing; `memory` in production): app fails at startup with an error naming the missing variables and never echoing values. Test in Task 5.
3. **Uploaded object does not match what was promised** (larger than allowed, wrong content type; Supabase cannot bind size at signing): `verifyUpload` deletes it and reports why. Test in Task 6.
4. **Signed-URL lifetime out of range** (0, negative, 24 h): rejected; allowed range 30–3600 s. Test in Task 6.
5. **Secret leakage:** missing-variable errors, provider `toString`, and the public-env object never contain secret values. Test in Task 5.

---

### Task 1: Monorepo skeleton and first push

**Files:**
- Create: `package.json`, `.gitignore`, `.nvmrc`, `tsconfig.base.json`, `README.md`, `packages/domain/package.json`, `packages/domain/tsconfig.json`, `packages/domain/src/index.ts`, `packages/domain/src/limits.ts`, `packages/domain/src/limits.test.ts`
- Existing (do not modify): `docs/`, `ARCHITECTURE.md`, `DESIGN.md`, `PRODUCT.md`

**Interfaces:**
- Produces: workspace layout and scripts at root: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` (each runs in all workspaces that define it); `@moto-trails/domain` exporting `GPX_MAX_BYTES = 5 * 1024 * 1024`, `IMAGE_MAX_BYTES = 10 * 1024 * 1024`, `IMAGE_MAX_MEGAPIXELS = 40`.

- [ ] **Step 1: Initialise git** in the project folder (`git init -b main`), add remote `origin https://github.com/annuai/myto-trails.git`. `.gitignore` must exclude `node_modules`, `.next`, `.env*` except `.env.example`, `.DS_Store`, `.vercel`, `coverage`.
- [ ] **Step 2: Write failing test** `limits.test.ts`: `expect(GPX_MAX_BYTES).toBe(5242880)`, `expect(IMAGE_MAX_BYTES).toBe(10485760)`, `expect(IMAGE_MAX_MEGAPIXELS).toBe(40)`.
- [ ] **Step 3: Run** `npx vitest run` in `packages/domain` — Expected: FAIL (module missing).
- [ ] **Step 4: Implement** the root workspace `package.json` (private, `engines.node >=22`, scripts above via `npm run <x> --workspaces --if-present`), `packages/domain` (TypeScript, Vitest devDependency, ES module exports from `src/index.ts`), and `limits.ts`.
- [ ] **Step 5: Run** `npm install && npm test` — Expected: PASS.
- [ ] **Step 6: Commit** all existing docs plus the skeleton (`chore: monorepo skeleton and project docs`), then `git push -u origin main` — Expected: push succeeds (gh is already logged in as `annuai`).

### Task 2: Design tokens package

**Files:**
- Create: `packages/tokens/package.json`, `packages/tokens/src/tokens.css`, `packages/tokens/src/trails.css`, `packages/tokens/src/parse.ts`, `packages/tokens/src/contrast.ts`, `packages/tokens/src/tokens.test.ts`, `tooling/find-hardcoded-colors.ts`, `tooling/find-hardcoded-colors.test.ts`, `tooling/check-colors.mjs`

**Interfaces:**
- Produces: `parseCssVariables(css: string): Record<string, string>` (custom property → value, last declaration wins); `contrastRatio(foregroundHex: string, backgroundHex: string): number` (WCAG 2.x relative luminance); `findHardcodedColors(source: string): string[]` (hex literals found, e.g. `["#fff"]`); CSS files exported as `@moto-trails/tokens/tokens.css` and `@moto-trails/tokens/trails.css`. `tokens.css` defines the shared Myto values under `@theme` using Myto's own names (`--color-background`, `--color-surface`, `--color-foreground`, `--color-muted`, `--color-border`, `--color-brand-red`, `--color-dark`, terrain tints, `--font-sans`, `--font-display`, `--spacing`, easing/duration variables); `trails.css` defines `--color-accent`, `--color-accent-hover`, `--color-accent-subtle`, `--color-status-{good,caution,stop,unknown,info}`, dark-theme variants under `[data-theme="dark"]`, `--radius-{none,sm,md}`, `--space-section` (64px, 48px below 640px).

- [ ] **Step 1: Write failing tests** in `tokens.test.ts`: `contrastRatio("#1a1a1a","#f2ede8")` ≥ 14.9; every pair below meets its minimum when read from the CSS files via `parseCssVariables` — foreground/background ≥ 14, muted/background ≥ 4.5, accent/background ≥ 7, accent/white-on-accent ≥ 7, each `status-*` on background ≥ 4.5, each dark status on `#1c1c1a` ≥ 4.5; `parseCssVariables` returns `#be3a23` for `--color-brand-red`.
- [ ] **Step 2: Write failing tests** in `find-hardcoded-colors.test.ts`: finds `#fff`, `#1a1a1a`, `#00000014` in a snippet; ignores `#section` anchors and `&#39;` entities; returns `[]` for code using `bg-surface`.
- [ ] **Step 3: Run** `npx vitest run` in each package — Expected: FAIL.
- [ ] **Step 4: Implement** the functions and both CSS files with the exact values from Global Constraints. `check-colors.mjs` is a CLI that scans `apps/**/src/**` for `.ts`, `.tsx`, `.css` files and exits 1 listing offenders; wire it as root script `npm run check:colors`.
- [ ] **Step 5: Run** all tests and `npm run check:colors` — Expected: PASS, exit 0.
- [ ] **Step 6: Commit** (`feat(tokens): shared Myto tokens and Trails layer with contrast tests`).

### Task 3: Web shell (header, footer, health, site URL)

**Files:**
- Create: `apps/web/` (Next.js App Router, TypeScript, Tailwind v4, Vitest + jsdom + Testing Library), `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/donate/page.tsx`, `apps/web/src/app/api/health/route.ts`, `apps/web/src/app/globals.css`, `apps/web/src/layout/SiteHeader.tsx`, `apps/web/src/layout/SiteFooter.tsx`, `apps/web/src/lib/site.ts`, tests beside each (`site.test.ts`, `SiteFooter.test.tsx`, `health.test.ts`)

**Interfaces:**
- Consumes: `@moto-trails/tokens` CSS (imported in `globals.css` after `@import "tailwindcss"`).
- Produces: `getSiteUrl(env: { SITE_URL?: string; NODE_ENV?: string }): string` (no trailing slash; default `http://localhost:3000` outside production; throws if production and unset or not `https://`); `GET /api/health` → `200 {"status":"ok"}`; components `SiteHeader()`, `SiteFooter()`.

- [ ] **Step 1: Write failing tests:** `getSiteUrl({SITE_URL:"https://moto-trails.com/"})` → `"https://moto-trails.com"`; `getSiteUrl({NODE_ENV:"development"})` → `"http://localhost:3000"`; `getSiteUrl({NODE_ENV:"production"})` throws; `getSiteUrl({NODE_ENV:"production",SITE_URL:"http://x.com"})` throws. `SiteFooter` renders the text "Moto Trails is a subsidiary of myto-moto" with a link whose `href` is `https://www.myto-moto.com`, and a link named "Donate" with `href="/donate"`. Health handler returns status 200 and JSON `{status:"ok"}`.
- [ ] **Step 2: Run** `npx vitest run` in `apps/web` — Expected: FAIL.
- [ ] **Step 3: Scaffold** the Next.js app non-interactively into `apps/web` (App Router, `src/` dir, TypeScript, no ESLint prompts beyond the default, Tailwind v4), name it `@moto-trails/web`, add the workspace dependencies on tokens and domain. Load Geist and Michroma with `next/font` bound to `--font-sans` / `--font-display`. Implement `getSiteUrl`, `SiteHeader` (text wordmark "Moto Trails" in the display font, no parent link), `SiteFooter` (Donate link, the subsidiary statement, hairline top border, no fill), home page (headline placeholder and the text "Trail directory coming soon"), `/donate` placeholder ("Donations are not open yet."), health route, and `metadataBase` from `getSiteUrl`.
- [ ] **Step 4: Run** tests, `npm run typecheck`, `npm run build -w @moto-trails/web`, `npm run check:colors` — Expected: all PASS.
- [ ] **Step 5: Run** the dev server, fetch `/`, `/donate`, `/api/health` with curl — Expected: 200 each; `/` HTML contains "subsidiary of myto-moto".
- [ ] **Step 6: Commit** (`feat(web): app shell, footer statement, health route`).

### Task 4: StatusBadge and design-system page

**Files:**
- Create: `packages/domain/src/enums.ts`, `packages/domain/src/enums.test.ts`, `apps/web/src/ui/StatusBadge/StatusBadge.tsx`, `apps/web/src/ui/StatusBadge/StatusBadge.test.tsx`, `apps/web/src/ui/StatusBadge/status-map.ts`, `apps/web/src/app/design/page.tsx`
- Modify: `packages/domain/src/index.ts`

**Interfaces:**
- Produces in domain: string-union types and arrays `ACCESS_CLASSES = ["public","permission_required","private_no_access","restricted","unknown"]`, `OPERATIONAL_STATUSES = ["open","temporarily_closed","permanently_closed","seasonal","unknown"]`, `VERIFICATION_LEVELS = ["officially_verified","moderator_verified","community_reported","unverified"]` with types `AccessClass`, `OperationalStatus`, `VerificationLevel`.
- Produces in web: `StatusBadge(props: { kind: "access" | "condition" | "verification"; value: AccessClass | OperationalStatus | VerificationLevel; date?: string })` rendering an `aria-hidden` SVG glyph plus the word, never colour alone; `statusFor(kind, value): { label: string; tone: "good"|"caution"|"stop"|"unknown"; glyph: "circle"|"triangle"|"square"|"diamond"|"open-circle"|"check" }`.

Mapping (labels in sentence case): access — public "Publicly accessible" good circle; permission_required "Permission required" caution triangle; private_no_access "Private – no public access" stop square; restricted "Restricted access" stop square; unknown "Access unknown" unknown open-circle. Condition — open "Open" good circle; seasonal "Seasonal access" caution diamond; temporarily_closed "Temporarily closed" stop square; permanently_closed "Permanently closed" stop square; unknown "Condition unknown" unknown open-circle. Verification — officially_verified "Officially verified" good check; moderator_verified "Moderator verified" good check; community_reported "Community reported" caution triangle; unverified "Unverified" unknown open-circle.

- [ ] **Step 1: Write failing tests:** every enum array has its exact members; `statusFor` returns the mapping above for all 14 pairs (table-driven); `StatusBadge` for `("access","permission_required")` renders the text "Permission required" and has no element with role `img` lacking a name; with `date="2026-08-14"` it also renders "14 Aug 2026".
- [ ] **Step 2: Run** tests — Expected: FAIL.
- [ ] **Step 3: Implement** enums, `statusFor`, `StatusBadge` (tone sets text colour from `--color-status-*` via a Tailwind utility mapped to the token; no fills), and `/design` page listing colour swatches (read from token classes), type scale, all 14 badges, and focus-ring demo. Mark `/design` `robots: noindex`.
- [ ] **Step 4: Run** tests, typecheck, `npm run check:colors`, build — Expected: PASS.
- [ ] **Step 5: Verify visually:** load `/design` at 390px and 1280px widths in the browser tool; confirm every badge shows glyph plus word and nothing relies on colour. Record any issue and fix before commit.
- [ ] **Step 6: Commit** (`feat(web): StatusBadge and design-system page`).

### Task 5: Environment configuration

**Files:**
- Create: `apps/web/src/server/env.ts`, `apps/web/src/server/env.test.ts`, `.env.example`

**Interfaces:**
- Produces: `type StorageConfig = { provider: "memory" } | { provider: "r2"; accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicBaseUrl: string } | { provider: "supabase"; url: string; serviceRoleKey: string; bucketPrefix: string }`; `loadServerEnv(source: Record<string, string | undefined>): { siteUrl: string; storage: StorageConfig; supabaseUrl?: string; supabaseAnonKey?: string; databaseUrl?: string }`; `class EnvError extends Error { missing: string[] }`; `getPublicEnv(source): { siteUrl: string; supabaseUrl?: string; supabaseAnonKey?: string }`.
- Variables: `SITE_URL`, `NODE_ENV`, `STORAGE_PROVIDER` (`memory|r2|supabase`, default `memory` outside production), `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET_PREFIX` (default `trails`), `DATABASE_URL`.

- [ ] **Step 1: Write failing tests:** default provider is `memory` in development; `STORAGE_PROVIDER=r2` with no R2 vars throws `EnvError` whose `missing` equals `["R2_ACCOUNT_ID","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","R2_BUCKET","R2_PUBLIC_BASE_URL"]`; the error `message` contains the names but not a supplied secret value (set `R2_SECRET_ACCESS_KEY="s3cr3t-value"` with another var missing and assert `message` does not contain `s3cr3t-value`); `NODE_ENV=production` with provider `memory` throws; unknown provider throws; `getPublicEnv` result serialised with `JSON.stringify` contains neither the service role key nor any R2 value.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** with Zod validation; `.env.example` lists every variable name with empty values and a comment per group (no real values).
- [ ] **Step 4: Run** tests and typecheck — Expected: PASS.
- [ ] **Step 5: Commit** (`feat(web): validated environment configuration`).

### Task 6: Storage interface, key builder, memory provider, upload verification

**Files:**
- Create: `apps/web/src/server/storage/types.ts`, `keys.ts`, `keys.test.ts`, `memory-provider.ts`, `verify-upload.ts`, `verify-upload.test.ts`, `contract.ts` (shared test suite, not a test file), `memory-provider.test.ts`, `index.ts`

**Interfaces:**
- Produces in `types.ts`:
  - `type StorageBucket = "quarantine" | "originals" | "public"`
  - `type UploadTarget = { url: string; method: "PUT"; headers: Record<string, string> }`
  - `interface StorageProvider { readonly name: "memory" | "r2" | "supabase"; createUploadUrl(i: { bucket: StorageBucket; key: string; contentType: string; sizeBytes: number; expiresInSeconds: number }): Promise<UploadTarget>; createDownloadUrl(i: { bucket: StorageBucket; key: string; expiresInSeconds: number; downloadFilename?: string }): Promise<string>; head(bucket: StorageBucket, key: string): Promise<{ sizeBytes: number; contentType: string } | null>; remove(bucket: StorageBucket, key: string): Promise<void>; publicUrl(key: string): string }` (`publicUrl` is only for the `public` bucket).
  - `class InvalidKeyError extends Error`, `class InvalidExpiryError extends Error`.
- Produces in `keys.ts`: `buildObjectKey(i: { kind: "gpx" | "image" | "evidence"; ownerId: string; objectId: string; ext: "gpx" | "jpg" | "png" | "webp" | "avif" | "heic" | "pdf" }): string` → `"<kind>/<ownerId>/<objectId>.<ext>"`; `assertSafeKey(key: string): void`; `assertExpiry(seconds: number): void` (integer 30–3600).
- Produces in `verify-upload.ts`: `verifyUpload(provider: StorageProvider, i: { bucket: StorageBucket; key: string; expectedSizeBytes: number; maxBytes: number; allowedContentTypes: string[] }): Promise<{ ok: true } | { ok: false; reason: "missing" | "too_large" | "size_mismatch" | "type_not_allowed" }>` — on any failure other than `missing` the object is removed.
- Produces in `contract.ts`: `runStorageContract(name: string, make: () => Promise<{ provider: StorageProvider; upload: (b: StorageBucket, key: string, bytes: Uint8Array, contentType: string) => Promise<void> }>)` registering Vitest cases: head returns null for an unknown key; after upload `head` returns size and type; `remove` is idempotent; `createDownloadUrl` returns a string URL; invalid keys and expiries are rejected before any I/O.
- Produces in `index.ts`: `createStorage(config: StorageConfig): StorageProvider` (R2 and Supabase branches added in Tasks 7–8; throws for them until then), `getStorage(): StorageProvider` (lazy singleton from `loadServerEnv(process.env)`).

- [ ] **Step 1: Write failing tests** in `keys.test.ts`: valid input yields `"gpx/0b9f…/7c1a….gpx"` for UUIDs; rejects (throws `InvalidKeyError`) non-UUID ids, `ext:"exe"`, and `assertSafeKey` rejects `"../x"`, `"/abs"`, `"a\\b"`, `"a\u0000b"`, `"a/./b"`, and a 300-character key; `assertExpiry` rejects 0, -5, 29, 3601, 1.5 and accepts 30 and 3600.
- [ ] **Step 2: Write failing tests** in `verify-upload.test.ts` using the memory provider: missing object → `{ok:false,reason:"missing"}`; object of 6 MB with `maxBytes` 5 MB → `too_large` and the object is gone; size differing from `expectedSizeBytes` → `size_mismatch` and removed; `application/zip` when only `application/gpx+xml` allowed → `type_not_allowed` and removed; matching object → `{ok:true}` and still present. `memory-provider.test.ts` calls `runStorageContract("memory", …)`.
- [ ] **Step 3: Run** — Expected: FAIL.
- [ ] **Step 4: Implement** all files. The memory provider keeps objects in a `Map`, returns `memory://upload/<bucket>/<key>` targets, and exposes the `upload` helper to tests; `publicUrl` returns `memory://public/<key>`.
- [ ] **Step 5: Run** tests and typecheck — Expected: PASS.
- [ ] **Step 6: Commit** (`feat(storage): provider interface, safe keys, upload verification, memory provider`).

### Task 7: Cloudflare R2 provider

**Files:**
- Create: `apps/web/src/server/storage/r2-provider.ts`, `r2-provider.test.ts`, `r2-provider.live.test.ts`
- Modify: `apps/web/src/server/storage/index.ts`

**Interfaces:**
- Consumes: `StorageConfig` (`provider: "r2"` branch), `StorageProvider`, `assertSafeKey`, `assertExpiry`.
- Produces: `createR2Provider(config: Extract<StorageConfig, { provider: "r2" }>): StorageProvider` using one R2 bucket with logical buckets as key prefixes (`quarantine/`, `originals/`, `public/`); endpoint `https://<accountId>.r2.cloudflarestorage.com`, region `auto`; `publicUrl(key)` = `<publicBaseUrl>/public/<key>`; `toString()` returns `"r2"` only.

- [ ] **Step 1: Write failing offline tests** (fake credentials, no network): `createUploadUrl` for a 1,000-byte `application/gpx+xml` upload returns method `PUT`, a URL whose query has `X-Amz-Expires` equal to the requested seconds and whose `X-Amz-SignedHeaders` includes both `content-type` and `content-length`, and whose path starts with `/quarantine/gpx/` (or the host carries the bucket); `createDownloadUrl` with `downloadFilename: "trail.gpx"` embeds `response-content-disposition` containing `attachment` and `trail.gpx`; `publicUrl("image/u/o.webp")` equals `<publicBaseUrl>/public/image/u/o.webp`; invalid key/expiry throws before signing; `String(provider)` contains no secret.
- [ ] **Step 2: Write the live test** `r2-provider.live.test.ts`, skipped unless `STORAGE_TEST_LIVE=1` and `STORAGE_PROVIDER=r2`: runs `runStorageContract` against real R2 using a PUT through the signed URL, then cleans up its keys.
- [ ] **Step 3: Run** — Expected: offline tests FAIL, live test SKIPPED.
- [ ] **Step 4: Implement** with `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`; ensure content-type and content-length are signed so the client must send exactly the declared values (the test above is the arbiter). Wire the `r2` branch into `createStorage`.
- [ ] **Step 5: Run** offline tests and typecheck — Expected: PASS.
- [ ] **Step 6: Commit** (`feat(storage): Cloudflare R2 provider`).

### Task 8: Supabase Storage provider, setup and smoke scripts

**Files:**
- Create: `apps/web/src/server/storage/supabase-provider.ts`, `supabase-provider.test.ts`, `supabase-provider.live.test.ts`, `apps/web/scripts/storage-setup.ts`, `apps/web/scripts/storage-smoke.ts`
- Modify: `apps/web/src/server/storage/index.ts`, `apps/web/package.json` (scripts `storage:setup`, `storage:smoke`)

**Interfaces:**
- Consumes: `StorageConfig` (`supabase` branch), `StorageProvider`.
- Produces: `createSupabaseProvider(config: Extract<StorageConfig, { provider: "supabase" }>): StorageProvider` mapping logical buckets to Supabase buckets named `<bucketPrefix>-quarantine`, `<bucketPrefix>-originals`, `<bucketPrefix>-public` (public bucket is publicly readable; the others are private); `ensureSupabaseBuckets(config): Promise<void>` creating missing buckets idempotently. Supabase cannot bind upload size at signing, so callers must run `verifyUpload` (document in the file header).
- Scripts: `npm run storage:setup -w @moto-trails/web` (creates buckets for the configured provider; no-op for `memory` and `r2`, printing that R2 buckets are created in the Cloudflare dashboard); `npm run storage:smoke -w @moto-trails/web` uploads a small file through a signed URL, verifies it, downloads through a signed URL, removes it, and prints `PASS provider=<name>` (exit 1 on failure, never printing secrets).

- [ ] **Step 1: Write failing offline tests** with a stubbed Supabase client: logical-bucket-to-bucket-name mapping; `publicUrl(key)` is `<url>/storage/v1/object/public/<prefix>-public/<key>`; invalid key/expiry rejected before the client is called; `head` returns `null` when the client reports not found; `toString()` has no secret.
- [ ] **Step 2: Write the live test** skipped unless `STORAGE_TEST_LIVE=1` and `STORAGE_PROVIDER=supabase`; it runs `runStorageContract` and pins the exact HTTP shape Supabase's signed upload URL expects (the returned `UploadTarget` must work with a plain `fetch`).
- [ ] **Step 3: Run** — Expected: offline FAIL, live SKIPPED.
- [ ] **Step 4: Implement** the provider, wire `supabase` into `createStorage`, write the two scripts (smoke script works against `memory` with no credentials, which is what runs in CI).
- [ ] **Step 5: Run** offline tests, typecheck, and `npm run storage:smoke -w @moto-trails/web` with `STORAGE_PROVIDER=memory` — Expected: PASS, output `PASS provider=memory`.
- [ ] **Step 6: Commit** (`feat(storage): Supabase provider, setup and smoke scripts`).

### Task 9: CI, runbook and ADRs

**Files:**
- Create: `.github/workflows/ci.yml`, `docs/runbooks/dev-setup.md`, `docs/adr/0001-independent-domain.md`, `docs/adr/0002-supabase-database-and-auth.md`, `docs/adr/0003-switchable-object-storage.md`
- Modify: `README.md`

**Interfaces:** none produced for code; the workflow runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run check:colors`, `npm run build`, and `npm run storage:smoke -w @moto-trails/web` (provider `memory`) on pushes and pull requests.

- [ ] **Step 1: Write** the workflow (Node from `.nvmrc`, npm cache) and the three short ADRs (context, decision, consequences, each referencing the doc section it comes from; ADR 3 records "R2 for development now, Supabase Storage as fallback, switch via `STORAGE_PROVIDER`").
- [ ] **Step 2: Write** `docs/runbooks/dev-setup.md`: clone, `npm install`, copy `.env.example` to `apps/web/.env.local`, where each Supabase and Cloudflare value comes from (names only), how to switch providers, how to connect the GitHub repo to Vercel and add the same variables, and the free-tier cautions (Supabase pauses after a week idle and has no backups; Vercel Hobby is non-commercial). Update `README.md` with commands and links to the docs.
- [ ] **Step 3: Run locally** the exact CI command sequence — Expected: all green.
- [ ] **Step 4: Commit and push** (`chore: CI, runbook and ADRs`); then check the workflow result with `gh run list --limit 1` — Expected: completed, success.
- [ ] **Step 5: Final verification:** `git status` clean; `git log --oneline` shows one commit per task; confirm `.env.local` is ignored (`git check-ignore apps/web/.env.local`).

---

## Waiting on the user (not part of this plan's tasks)
- Create the Vercel project from the GitHub repo and add environment variables; create the Supabase project (free) and, once payment is set up, the Cloudflare R2 bucket and token; put values into `apps/web/.env.local` and Vercel yourself (never in chat). Until R2 credentials exist, `STORAGE_PROVIDER=memory` is the default and everything above runs.
- Domain purchase, legal review, Navi details, moderators: later, per earlier decisions.

## Self-review notes
- **Spec coverage:** tokens and contrast (doc 09) → Task 2; footer subsidiary statement and Donate link (docs 03, 07) → Task 3; StatusBadge and design page (docs 08, 09, M0 "design-system page skeleton") → Task 4; storage and limits (doc 05 §8–9, user request for switchable R2) → Tasks 5–8; CI, ADRs, runbook (M0) → Task 9. Not covered by design: Supabase database schema (M1), auth (M3), search (M2), real `/donate` content (M7).
- **Type consistency:** `StorageConfig` is defined in Task 5 and consumed in Tasks 6–8; `StorageProvider`, `StorageBucket`, `assertSafeKey`, `assertExpiry` defined in Task 6 and used in 7–8; enums defined in Task 4 only.
- **Proportion:** code appears only for signatures and fixed mappings; bodies are left to the implementer.
