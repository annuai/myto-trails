# Moto Trails: agent instructions

Monorepo: `apps/web` (Next.js on Vercel), `apps/mobile` (Expo, "Myto Moto"), `packages/{tokens,domain}`, `tooling`.
**Documentation index: [README.md](README.md#where-to-look-the-documentation-index).** Check it and grep `docs/` before exploring code.

## Working rules (token-lean)
- Load context progressively: index → the one relevant doc → only the needed section (`grep -n` then read a line range). Never read whole docs or `docs/superpowers/plans/`.
- Search docs for the answer before investigating; treat documented decisions (`docs/adr/`) as settled.
- Fix stale docs in place; do not add new doc files or copy facts between docs (link instead). New decision → new ADR only if it changes an existing one's direction.
- Reading a web page: `npx @only-cli/oc open <url>` (run `npx @only-cli/oc --help` once), not raw HTML.
- Small changes: edit and run only the affected test, not the whole suite.

## Commands (repo root)
`npm test` · `npm run lint` · `npm run typecheck` · `npm run check:tokens` · `npm run check:colors` · `npm run check:versions`

## Conventions
- Mobile styling: no raw spacing, colour or type values; use tokens (`apps/mobile/src/theme/tokens.ts`, `packages/tokens`, `*.tokens.ts`). Run `check:tokens` after UI work. See [docs/design-tokens.md](docs/design-tokens.md).
- Data/dev server run on Supabase + R2 (`apps/web/.env.local`), not local Postgres; `*.db.test.ts` need local PostGIS and are not run routinely. See [dev-setup](docs/runbooks/dev-setup.md).
- Free-tier only (Vercel Hobby, Supabase free, R2): features must cost nothing to run.
- Next.js here has breaking changes: read `node_modules/next/dist/docs/` before web code ([apps/web/AGENTS.md](apps/web/AGENTS.md)).
- Keep `.env*`, `apps/web/data.sql` and `.claude/` out of commits. Versioning: [docs/versioning.md](docs/versioning.md).
