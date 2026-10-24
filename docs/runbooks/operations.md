# Operations runbook

Status: written ahead of launch. Items marked **(needs account)** cannot be done until the production accounts exist.

## First administrator
There is no sign-up path to a role. After the first person signs in once, an operator promotes them in the database (the only time this is done by hand); every later grant is made on `/moderate/users` and audited.

```sql
insert into user_role (user_id, role) select id, 'admin' from app_user where email = 'you@example.com';
```

## Releasing
1. `npm test` and `npm run test:db -w @moto-trails/web` are green in CI.
2. Review new files in `apps/web/db/migrations`. Migrations are forward-only and run by `npm run db:migrate -w @moto-trails/web` against the target `DATABASE_URL`. **Never run them against production without a fresh backup.** **(needs account)**
3. Deploy the app (Vercel). A production build queries the database, so migrate first.

## Backups and restore drill **(needs account)**
- Production uses a paid Supabase plan with daily backups and point-in-time recovery. Free projects have no backups and pause when idle: do not launch on them.
- Weekly logical backup kept outside the provider: `pg_dump --format=custom --no-owner "$DATABASE_URL" > moto-trails-$(date +%F).dump`.
- Object storage (R2): enable bucket versioning for `originals/` and `public/`; the database is the index, so restore the database first, then objects.
- **Restore drill before beta:** restore the latest dump into a scratch database (`createdb`, `pg_restore --no-owner`), run `npm run db:migrate`, run the app against it, open three trails and one GPX download, then record the date and time taken here.

## Secrets
Keep keys only in the host's environment settings and `apps/web/.env.local` (git-ignored). Rotate a key by creating the new one, deploying, then revoking the old one. If a key was ever pasted into chat, a ticket or a commit, treat it as leaked and rotate it. Variables are listed in `.env.example` and `dev-setup.md`.

## Moderation handbook (short)
- Open `/moderate`. Work oldest first; `Reports` and `Access checks due` have their own pages.
- Access comes first: is the claim supported, and does the access class match the evidence? When unsure, publish less (unknown stays unknown) or ask for changes.
- Restricted access and protected areas need two different approvers; the second approval publishes.
- Verify access by recording how you checked (call, document, notice) and an expiry. Expired verification shows to riders as "needs re-check".
- Owner or authority removal requests: unpublish first (trail controls), then review.
- Everything is in the audit log; it cannot be edited.

## Incidents
1. Stop the harm: unpublish the trail or content, or suspend the account (`/moderate/users`).
2. Preserve evidence: do not delete rows; the audit log and decision records are append-only.
3. If personal data may have been exposed, tell the affected people and note the date, scope and fix here.
4. Write a short post-mortem in `docs/runbooks/incidents/`.

## Launch blockers (as of this writing)
Production accounts and a domain; a transactional email provider; a map tile provider and its attribution; legal review of the terms, privacy text and contributor licence; an accountant's view on donations; real moderators; two-factor sign-in for moderators (needs an auth provider); an overlay dataset for protected areas (docs/11); real trail data.
