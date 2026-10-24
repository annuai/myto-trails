# Development setup

## First run
```bash
git clone https://github.com/annuai/myto-trails.git && cd myto-trails
npm install
npm test
npm run dev -w @moto-trails/web   # http://localhost:3000
```
With no configuration the app runs with `STORAGE_PROVIDER=memory`.

## Local database (PostgreSQL 17 + PostGIS)
Install once: `brew install postgresql@17 postgis` (large: it pulls in gdal, boost and others; if `node` stops working afterwards run `brew upgrade node`).

```bash
npm run db:start -w @moto-trails/web          # project-local cluster in .pgdata on port 54329, creates database moto_trails
export DATABASE_URL=postgres://localhost:54329/moto_trails
npm run db:migrate -w @moto-trails/web         # apply db/migrations
npm run db:seed:regions -w @moto-trails/web    # India, 28 states, 8 union territories
npm run db:seed:places -w @moto-trails/web     # built-in gazetteer of 120 places (Bangalore/Bengaluru etc.)
npm run db:import -w @moto-trails/web -- data/sample-trails.json --allow-samples   # six fictional SAMPLE trails (development databases only)
npm run dev -w @moto-trails/web
npm run test:db -w @moto-trails/web            # database tests (own throwaway databases)
npm run db:stop -w @moto-trails/web
```
Sample trails are clearly labelled and never indexed; the importer refuses them unless you pass `--allow-samples`, and always refuses them when `NODE_ENV=production`. Never point `DATABASE_URL` at a production database while importing samples. Real trails go in a JSON file with the same shape (see `src/server/import/schema.ts`) and are imported the same way.

**Production builds query the database** (cached pages such as `/regions` and `/sitemap.xml` are prerendered), so a build needs a reachable, migrated `DATABASE_URL`; the same applies to Vercel builds. Run `npm run db:migrate` against Supabase only when you decide to (it is not run automatically).

Accounts: sign-in is by emailed link. In development `EMAIL_PROVIDER=console` prints the link in the `next dev` log (look for `[email]`). Production **and Vercel previews** need `EMAIL_PROVIDER=resend` (the console sender is refused whenever `NODE_ENV=production`, because it would print live sign-in links into shared logs), `RESEND_API_KEY` and `EMAIL_FROM` (the server refuses to start without them). See ADR 0005.

Map: the default style is MapLibre's free demo style, for development only. Set `NEXT_PUBLIC_MAP_STYLE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION` for production (see `.env.example`). The MapLibre worker is copied to `public/vendor` by `npm run assets:maplibre` (runs before `dev` and `build`).

## Environment variables
Copy `.env.example` to `apps/web/.env.local` and fill it in yourself. Never paste keys into chat or commit them; `.env*` is git-ignored except `.env.example`.

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (URL and the public/"publishable" key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. **Secret**: bypasses all access rules. Local file and Vercel only, never browser code |
| `DATABASE_URL` | Supabase → Project Settings → Database → connection string (uses the database password you set at creation; Supabase cannot show it again) |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → R2 overview |
| `R2_BUCKET` | The bucket you created in R2 |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 → Manage API tokens → create a token with Object Read & Write limited to that bucket |
| `R2_PUBLIC_BASE_URL` | Public URL of the bucket (custom domain or the r2.dev URL) for the `public/` prefix |

## Switching storage provider
Set `STORAGE_PROVIDER` to `memory`, `r2` or `supabase` in `.env.local` (and in Vercel). Then:
```bash
npm run storage:setup -w @moto-trails/web   # creates Supabase buckets; no-op for memory and r2
npm run storage:smoke -w @moto-trails/web   # expects: PASS provider=<name>
npm run test:live -w @moto-trails/web       # opt-in contract tests against the real provider
```
`STORAGE_PROVIDER=memory` is refused in production. Supabase signed upload URLs are fixed at 2 hours and cannot bind upload size, so always run `verifyUpload` after an upload.

## Vercel
1. Import `annuai/myto-trails` in Vercel and set the project's **Root Directory** to `apps/web`.
2. Add the same environment variables. For previews you can leave `SITE_URL` unset (Vercel's `VERCEL_URL` is used); for production set `SITE_URL=https://moto-trails.com`.
3. Preview deployments may leave `STORAGE_PROVIDER` unset (they use the in-memory provider, so uploads do not persist). Production must set it, and the server refuses to start otherwise (`src/instrumentation.ts`).
4. The Hobby plan is for non-commercial use: move to a paid plan before launch.

## Free-tier cautions
Supabase free projects pause after a week of inactivity and have no automated backups; keep only test data there.
