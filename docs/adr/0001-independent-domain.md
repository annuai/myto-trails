# ADR 0001: Independent site on moto-trails.com

**Status:** accepted (2026-10-24). **Source:** [docs/05 §1](../05-technical-architecture.md), [docs/13 D-1](../13-risks-and-open-decisions.md).

**Context.** Myto Trails is a subsidiary of myto-moto but should be able to stand alone and be reached globally. The existing Myto site is Next.js on Vercel; its auth and data stores are unverified.

**Decision.** Canonical host is `https://moto-trails.com`. `trails.myto-moto.com`, `mytotrails.com`, `myto-trails.com` and `www` redirect (301) to it. The footer, About and legal pages state that Myto Trails is a subsidiary of myto-moto. Trails has its own accounts. Every absolute URL comes from one `SITE_URL` setting.

**Consequences.** No shared cookies with myto-moto.com; search authority starts from zero (mitigated by cross-links); changing the canonical host later is a migration with 301s, not a rebuild. Until the domain is bought, development runs on a Vercel preview address (`VERCEL_URL` is the fallback when `SITE_URL` is unset).
