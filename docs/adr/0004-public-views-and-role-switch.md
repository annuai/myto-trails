# ADR 0004: Public reads only through views, under the anon role

**Status:** accepted (2026-10-24). **Source:** [docs/06](../06-data-model.md), [docs/11](../11-security-and-moderation.md), [M1 plan](../superpowers/plans/2026-10-24-m1-data-core.md).

**Context.** Unpublished trails, evidence files, permission contacts and the exact start of sensitive trails must never reach the public site, even if a query is written wrongly.

**Decision.**
- Base tables have row-level security enabled, no policies and no grants for `anon` / `authenticated`.
- The public site reads only `public_regions`, `public_trails`, `public_trail_detail` and `public_trail_media`. These views show published trails with a published revision and expose safe columns only (no `permission_contact`, no evidence text, `lon`/`lat` from the approximate public point for non-standard sensitivity).
- Server code runs public reads through `withPublicRole`: one read-only transaction with `set local role anon`, so the database enforces the boundary.
- Slugs are validated before any query and always passed as parameters.

**Consequences.** Any new public field needs an explicit view change and a test in `rls.db.test.ts`. Works on Supabase because the `postgres` role can assume `anon`. If the Supabase Data API (PostgREST) is enabled, the same views are reachable through it, so disable it for this project unless it is wanted. Cached pages query the database at build time, so builds need a reachable, migrated `DATABASE_URL`.
