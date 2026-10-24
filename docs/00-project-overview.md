# 00 — Project overview

**Status:** Architecture & design specification, draft 1. No code exists. Awaiting review.
**Working name:** Myto Trails (subsidiary product of myto-moto.com)

## What this is

A reliable, community-powered, moderated directory of motorcycle trails in India. A rider can find a trail, understand how hard it is, learn whether they are *allowed* to ride it and whether it is *currently rideable*, inspect the route, download the GPX if permitted, and save it. Registered riders can contribute trails, which are moderated before publication.

It is not a travel directory, a blog, or a social network. The product's value is **trustworthy access and condition information**, not trail count.

## How to read these documents

| Doc | Contents |
|---|---|
| [01](01-existing-system-audit.md) | What was verified about myto-moto.com, and what was not |
| [02](02-product-requirements.md) | PRD: users, requirements, MVP scope, success metrics |
| [03](03-information-architecture.md) | Sitemap, navigation, page inventory, content relationships |
| [04](04-user-flows.md) | The seven journeys (Mermaid) |
| [05](05-technical-architecture.md) | Stack, hosting, maps, search, GPX, media, auth, with alternatives |
| [06](06-data-model.md) | ERD, entities, lifecycles, example records |
| [07](07-ux-wireframes.md) | Low-fidelity wireframes for eight key screens |
| [08](08-visual-direction.md) | Three visual directions, critique, recommendation |
| [09](09-design-system.md) | Tokens (shared vs Trails-specific), component specs |
| [10](10-component-architecture.md) | Folder structure, component inventory, conventions |
| [11](11-security-and-moderation.md) | Threat model, upload safety, moderation policy |
| [12](12-implementation-roadmap.md) | Milestones, non-goals for release 1 |
| [13](13-risks-and-open-decisions.md) | Risk register, decisions needing approval |
| [14](14-platform-contract.md) | API, GPX export, Trails app and Myto Navi contract |

Root summaries: [ARCHITECTURE.md](../ARCHITECTURE.md), [DESIGN.md](../DESIGN.md), [PRODUCT.md](../PRODUCT.md).

## The decisions that shape everything

1. **Access, condition and verification are three independent fields**, never a single "status". Access claims carry evidence, a verifier and an expiry date; stale claims decay to "unverified" automatically.
2. **Trails are stable identities; content is versioned.** A `Trail` points to a published `TrailRevision`. Edits and submissions create new revisions that go through moderation. History and rollback come for free.
3. **Geometry is gated.** Precise route coordinates and GPX files are never public until a trail has passed moderation *and* has an acceptable access classification. Sensitive areas can publish with deliberately reduced geometry.
4. **One boring stack.** A single Next.js app plus a managed PostgreSQL/PostGIS database. No microservices, no search cluster, no separate API tier in the MVP.
5. **Inherit the Myto design language, not its decoration.** Same typefaces, warm neutrals and token structure; a trail-specific accent; tighter radii and sentence-case labels. The look is modern, simple and minimal: generous whitespace, one accent, few boxes.
6. **Independent site, stated subsidiary.** Canonical host `moto-trails.com`; the footer, About and legal pages say Myto Trails is a subsidiary of myto-moto. It has its own accounts.
7. **Three clients, one backend.** Web first, built API-ready; then a public API, the Trails companion app (background ride recording and submission) and Myto Navi integration (doc 14).
8. **Find trails by place.** Search a city (e.g. Bangalore) or use "near me" to list nearby trails with approximate travel time.
9. **Donate button** (Myto the company receives funds; never influences listings or moderation).

## Ground rules followed in this phase

- Documentation only. No source code, migrations or config were created and the existing Myto website was only read, never modified.
- Verified facts and assumptions are marked separately (see doc 01).
- Coverage is never claimed. The product says "N trails across M states", derived from data, never "all of India".
