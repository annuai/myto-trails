# Development setup

## First run
```bash
git clone https://github.com/annuai/myto-trails.git && cd myto-trails
npm install
npm test
npm run dev -w @moto-trails/web   # http://localhost:3000
```
With no configuration the app runs with `STORAGE_PROVIDER=memory`.

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
3. The Hobby plan is for non-commercial use: move to a paid plan before launch.

## Free-tier cautions
Supabase free projects pause after a week of inactivity and have no automated backups; keep only test data there.
