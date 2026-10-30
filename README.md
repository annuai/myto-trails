# Moto Trails

A moderated, community-contributed directory of motorcycle trails, opening country by country (India first).

- Product, architecture and design specification: [docs/](docs/00-project-overview.md)
- Implementation plans: [docs/superpowers/plans/](docs/superpowers/plans/)

Database tests: `npm run test:db -w @moto-trails/web` (needs the local PostGIS cluster; see the runbook).

Commands (run from the repo root): `npm test`, `npm run lint`, `npm run typecheck`, `npm run check:colors`, `npm run build`.

- Setup, environment variables, storage switching and Vercel: [docs/runbooks/dev-setup.md](docs/runbooks/dev-setup.md)
- Adding a trail by hand (photos, videos, GPX, upload, import): [docs/runbooks/add-a-trail.md](docs/runbooks/add-a-trail.md)
- The Myto Moto app (`apps/mobile`, Expo): [app README](apps/mobile/README.md), [architecture](docs/15-myto-app-architecture.md), [UI and what was added since](docs/16-myto-app-ui.md)
- Feature designs, one per feature (ride companion, journal, notifications, route planning, ride notification, motion detection): [docs/superpowers/specs/](docs/superpowers/specs/)
- Versioning and releases: [docs/versioning.md](docs/versioning.md)
- Decisions: [docs/adr/](docs/adr/)

Also: `npm run check:tokens` (no raw spacing, colour or type values) and `npm run check:versions` (one product version).

Layout: `apps/web` (Next.js), `apps/mobile` (Expo app), `packages/tokens` (design tokens), `packages/domain` (shared rules), `tooling` (checks).
