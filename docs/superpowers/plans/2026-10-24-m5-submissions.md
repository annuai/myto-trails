# M5 submission workflow Implementation Plan (condensed)

> Executed inline, test-first, one fresh whole-branch review at the end. Autonomous run: decisions are recorded as rulings in the final report.

**Goal:** A signed-in rider can submit a new trail (details, GPX, access claim with evidence, photos) through a step-by-step form with saved drafts, see duplicate warnings, submit it for review, follow its status, and edit and resubmit after a moderator asks for changes.

**Spec:** docs/02 (S-1…S-6), docs/04 §5, docs/06 (submission, trail_revision, access_assessment, evidence), docs/07, docs/11 (limits), docs/12 M5.

## Decisions
- **Drafts live in `submission`, not in the core tables.** `trail_revision` has strict NOT NULL columns, so a half-filled form cannot be stored there. A draft is a `submission` row with a `data jsonb` of the form so far and a validated copy is written to `trail` + `trail_revision` only on submit, in one transaction.
- **Per-step validation** with one Zod schema per step (`server/submissions/schema.ts`), composed into a full schema used at submit. Enum values come from `@moto-trails/domain` so form, import tool and database agree.
- **Autosave** = a client component that saves the current step through the same server action after a short pause, plus an explicit "Save and continue"; the form also works without JavaScript (each step posts normally).
- **Uploads reuse M4** (`/api/uploads`, `completeUpload`): the GPX and photos are attached to the draft by upload id; ownership is checked (an upload must belong to the same user and be `ready`). Photos become `media` rows (`revision_id` set at submit); the GPX route row gets `revision_id` at submit.
- **Access claim:** a contributor can assert at most `community_reported` (docs/06); evidence is text and/or URL (file evidence is private and arrives with moderation tools in M6). `private_no_access` can be submitted (it is useful to record) but is never publishable (M6 enforces).
- **Slug** is generated from the name at first submit with numeric suffixes for collisions; it is not public until publication.
- **Limits:** 5 submissions per user per day, 10 open drafts, 8 photos per submission, step text limits from docs/06.
- **Status mirrors the revision state** (`draft`, `submitted`, `changes_requested`, `approved`, `rejected`); moderator feedback is shown when present (the moderation tool that writes it is M6).
- **Edit and resubmit:** from `changes_requested` the contributor edits the data again; resubmit creates revision `version_no + 1` for the same trail. Edits to a published trail by others are out of scope (reports cover that).

## Global constraints
- Everything under `/submit` and `/account/contributions` requires a session; a submission is visible only to its owner (and moderators in M6). Another user's id returns 404, never 403.
- Server actions verify the session and ownership on every call; form data is parsed, never trusted; no HTML is stored or rendered from user text (React escapes; summaries have no URLs).
- Start point inside India (existing DB check); name 3–80, summary 40–400 without URLs.
- Duplicate warnings never block a submission.

## Tasks
1. **Schema 0010:** `submission` (user_id, client_id unique per user, kind, status, step, data jsonb, trail_id, revision_id, route_upload_id, duplicate_candidates, contributor_note, moderator_feedback, timestamps), RLS closed to anon; DB tests.
2. **Domain and validation:** step schemas, URL-free summary rule, point-in-India, evidence rules; unit tests.
3. **Submission service:** `createDraft`, `saveStep`, `attachRoute` (ownership, ready GPX), `attachPhotos`, `findDuplicates` (route overlap + trigram name in district), `submit` (transaction creating trail, revision, assessment, evidence, linking route and media, rate limit), `resubmit`, `listMine`, `getMine`, `withdraw`; DB tests incl. cross-user isolation and idempotent `client_id`.
4. **Wizard UI:** `/submit` (start, resume), `/submit/[id]/[step]` for basics, route (upload, preview, duplicates), details, access, photos, review; step indicator, autosave, upload field with progress.
5. **Status UI:** `/account/contributions` list and detail with status, feedback and resubmit; links from account and header.
6. **Verification and review:** browser journey (sign in, draft, interrupt, resume, submit), CI, fresh review, fixes, push.

## Review focus
1. Ownership: any route, upload, photo or submission id from another user must be refused (including ids smuggled in `data`).
2. Submit atomicity and idempotency: double submit, retried `client_id`, a failed transaction leaves no half-created trail.
3. Draft data: oversized or hostile JSON, unknown keys, huge arrays; values re-validated at submit, not trusted from the draft.
4. Access claim abuse: contributors cannot assert verified levels or set sensitivity/publication fields.
5. Duplicate detection leaks: candidates must only be published trails, never other users' drafts.
