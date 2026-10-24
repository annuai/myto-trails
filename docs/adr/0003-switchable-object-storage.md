# ADR 0003: Switchable object storage

**Status:** accepted (2026-10-24). **Source:** [docs/05 §2, §9](../05-technical-architecture.md), [M0 plan](../superpowers/plans/2026-10-24-m0-foundations.md).

**Context.** Photos and GPX files need cheap storage with no egress fees at scale (Cloudflare R2), but R2 credentials are not available yet and Supabase Storage is a reasonable fallback.

**Decision.** A `StorageProvider` interface with three implementations chosen by `STORAGE_PROVIDER`: `memory` (default in development and tests), `r2` and `supabase`. Application code never imports a vendor SDK. Object keys are generated from UUIDs, never user filenames. Because Supabase cannot bind upload size or content type at signing time, every upload is checked afterwards with `verifyUpload`, which deletes anything that does not match what was promised.

**Consequences.** Switching provider is a configuration change plus a one-off copy of existing objects. Live provider tests are opt-in (`npm run test:live -w @moto-trails/web`) and have not yet been run against real R2 or Supabase.
