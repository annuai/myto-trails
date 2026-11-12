# Moto Trails

A moderated, community-contributed directory of motorcycle trails, opening country by country (India first), plus the Myto Moto phone app.

Layout: `apps/web` (Next.js), `apps/mobile` (Expo app), `packages/tokens` (design tokens), `packages/domain` (shared rules), `tooling` (checks).

Commands (repo root): `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:colors`, `npm run check:tokens` (no raw spacing, colour or type values), `npm run check:versions` (one product version).

## Where to look (the documentation index)

Read the row for your task, then only the section you need. Do not read `docs/superpowers/plans/` (finished work, ~400 KB); search it with `grep` if you need history.

| Need | Source of truth |
|---|---|
| Project status, what is open | [docs/todo.md](docs/todo.md), [CHANGELOG.md](CHANGELOG.md), [docs/12](docs/12-implementation-roadmap.md) (web milestones), [docs/13](docs/13-risks-and-open-decisions.md) |
| Why something was decided | [docs/adr/](docs/adr/) (0001-0011); Rider OS scope and phases: [docs/audit/](docs/audit/) |
| Product, users, principles | [PRODUCT.md](PRODUCT.md) → [docs/02](docs/02-product-requirements.md), [docs/03](docs/03-information-architecture.md), [docs/04](docs/04-user-flows.md) |
| Web architecture, data model, security | [ARCHITECTURE.md](ARCHITECTURE.md) → [docs/05](docs/05-technical-architecture.md), [docs/06](docs/06-data-model.md), [docs/10](docs/10-component-architecture.md), [docs/11](docs/11-security-and-moderation.md) |
| Web ↔ app API | [docs/14](docs/14-platform-contract.md), [docs/ride-contract.md](docs/ride-contract.md) |
| Phone app architecture and UI | [apps/mobile/README.md](apps/mobile/README.md), [docs/15](docs/15-myto-app-architecture.md), [docs/16](docs/16-myto-app-ui.md) |
| Design direction and tokens | [DESIGN.md](DESIGN.md) → [docs/08](docs/08-visual-direction.md), [docs/09](docs/09-design-system.md); phone tokens: [docs/design-tokens.md](docs/design-tokens.md) |
| One feature's design | [docs/superpowers/specs/](docs/superpowers/specs/) (one per feature); also [photo-posts](docs/photo-posts.md), [ride-nudges](docs/ride-nudges.md), [sync-design](docs/sync-design.md) (not built), [universal-links](docs/universal-links.md), [pull-down-quotes](docs/pull-down-quotes.md) |
| Setup, env vars, storage, Vercel | [docs/runbooks/dev-setup.md](docs/runbooks/dev-setup.md) |
| Add a trail, operate the site, map tiles | [add-a-trail](docs/runbooks/add-a-trail.md), [operations](docs/runbooks/operations.md), [self-hosted-map-tiles](docs/runbooks/self-hosted-map-tiles.md) |
| Versions and releases | [docs/versioning.md](docs/versioning.md) |
| Competitor notes | [docs/competitive/](docs/competitive/) |
| Strategy, roadmap, monetisation, financial scenarios, image requests, the deck | [docs/myto-strategy/](docs/myto-strategy/strategy.md) (deck: `npm run deck:build`, `npm run deck:pdf`) |

Database tests (`npm run test:db -w @moto-trails/web`) create throwaway local databases and need local PostGIS; day-to-day development runs against Supabase (see [dev-setup](docs/runbooks/dev-setup.md)).
