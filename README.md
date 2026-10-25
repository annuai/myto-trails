# Moto Trails

A moderated, community-contributed directory of motorcycle trails in India.

- Product, architecture and design specification: [docs/](docs/00-project-overview.md)
- Implementation plans: [docs/superpowers/plans/](docs/superpowers/plans/)

Database tests: `npm run test:db -w @moto-trails/web` (needs the local PostGIS cluster; see the runbook).

Commands (run from the repo root): `npm test`, `npm run lint`, `npm run typecheck`, `npm run check:colors`, `npm run build`.

- Setup, environment variables, storage switching and Vercel: [docs/runbooks/dev-setup.md](docs/runbooks/dev-setup.md)
- Adding a trail by hand (photos, videos, GPX, upload, import): [docs/runbooks/add-a-trail.md](docs/runbooks/add-a-trail.md)
- Decisions: [docs/adr/](docs/adr/)

Layout: `apps/web` (Next.js), `packages/tokens` (design tokens), `packages/domain` (shared rules), `tooling` (checks).
