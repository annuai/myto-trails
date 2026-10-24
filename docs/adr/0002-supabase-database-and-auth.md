# ADR 0002: Supabase for database and auth

**Status:** accepted (2026-10-24). **Source:** [docs/05 §2](../05-technical-architecture.md), [docs/13 D-6](../13-risks-and-open-decisions.md).

**Context.** The product needs PostGIS spatial queries, relational data, row-level security and sign-in with a small team.

**Decision.** Supabase (Postgres + PostGIS + Auth). Neon with a separate auth library is the close second. The free tier is for development and staging only: it pauses after a week of inactivity and has no automated backups (checked 2026-10-24). Paid plans from the beta.

**Consequences.** One vendor to operate; low lock-in (plain Postgres), with Supabase Auth the only sticky part. Region near India and Vercel's commercial plan terms are unverified.
