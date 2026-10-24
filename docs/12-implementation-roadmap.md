# 12 — Implementation roadmap

Sequenced so that the **trust model (access/condition/verification) and the data pipeline are proven before the interface is polished**, and so each milestone ends in something demonstrable. Durations are deliberately omitted: they depend on team size, which is unknown (D-10). Each milestone is a vertical slice that could be reviewed on a preview URL.

**Global definition of done** (applies to every milestone): code reviewed; unit/integration tests for the milestone's logic pass in CI; accessibility checks (axe + keyboard pass) on new screens; mobile and desktop checked; no unresolved high-severity issues; docs and ADRs updated; deployed to staging.

## M0 — Foundations and decisions
- **Scope:** resolve open decisions (doc 13); register and confirm ownership of `moto-trails.com` (plus `mytotrails.com`, `myto-trails.com` as redirects); open Vercel and Supabase accounts (free tier for development/staging only; Cloudflare R2 is set up later, before beta); confirm Vercel plan terms for commercial use; confirm Myto auth/DNS facts (doc 01 unknowns); legal review kick-off (terms, licence, takedown policy); seed content plan (30–60 trails to curate); repo, CI, environments, shared tokens extracted.
- **Dependencies:** Myto team access.
- **Deliverables:** ADRs, empty app deployed to staging on the chosen domain, tokens package, design-system page skeleton, moderator recruitment.
- **Testing:** CI pipeline, preview deploys, lint rules banning hard-coded colours.
- **Risks:** decisions drift; unknown auth coupling.
- **Done:** staging URL live; D-1…D-10 recorded as decided or deferred.

## M1 — Data core and read-only public site
- **Scope:** schema, RLS, region seed, trail/revision/access/condition entities, seed import tooling for curated trails; trail detail page (go/no-go strip, text-only route, gallery), region pages, sitemap, SEO metadata.
- **Dependencies:** M0.
- **Deliverables:** published curated trails visible at stable URLs; `domain/` rules (effective verification level, GPX downloadability) with tests.
- **Testing:** RLS tests (public can't see drafts); unit tests for status derivation and expiry; Lighthouse/CWV baseline; structured data validation.
- **Risks:** schema churn; poor seed data quality.
- **Done:** 30 real, verified trails browsable; verification expiry displayed correctly; pages pass accessibility checks.

## M2 — Discovery and maps
- **Scope:** search (FTS + trigram), filters, URL state, sort, pagination, list view, map view (MapLibre, clusters, viewport list), route rendering, elevation profile, accessible list alternative; **place search** (gazetteer import with alternate names, grouped suggestions, radius chips), **near me** (geolocation, dot on map, denied fallback), **approximate travel time** with trail shape.
- **Dependencies:** M1; tile provider chosen and licensed.
- **Deliverables:** `/trails` list+map, split view and mobile sheet.
- **Testing:** query performance on a synthetic 10,000-trail dataset; e2e discover-and-open journey; map-failure fallback test; keyboard and screen-reader passes; alias tests (Bangalore / Bengaluru / Bengalooru); geolocation granted, denied and unavailable paths; test that repeated near-me queries cannot locate a sensitive trail's true start.
- **Risks:** tile cost/quota; mobile map performance.
- **Done:** discovery journey meets performance budgets on a mid-range Android profile; shared filter URLs reproduce results.

## M3 — Accounts, saved trails, reports
- **Scope:** auth, profile, Save/Saved with change badges, report an issue (all types), report triage storage, rate limits, transactional email.
- **Dependencies:** M1; auth decision (D-4).
- **Deliverables:** sign-in, Saved page, report workflow end-to-end into a basic moderator list.
- **Testing:** authorisation tests (cross-user access denied); rate-limit tests; email delivery in staging.
- **Risks:** abuse of reports; auth coupling.
- **Done:** a signed-in user can save and report; a moderator sees the report.

## M4 — GPX and media pipeline
- **Scope:** signed uploads, quarantine, GPX validation/parse/stats/elevation/duplicate detection, sanitised GPX download endpoint with interstitial, image processing (EXIF strip, variants), storage behind the storage interface (Supabase Storage in development), job runner, error surfaces; **GPX export per the doc 14 format** (plain GPX 1.1) with an acceptance test on a real Navi unit once one is available.
- **Dependencies:** M1; storage and job runner chosen.
- **Deliverables:** upload → processed → ready pipeline; downloads gated by access rules.
- **Testing:** corpus of good, malformed and hostile GPX/image files (XXE, huge, zero-point, teleporting tracks, polyglots); decompression-bomb test; duplicate detection precision/recall on a labelled set; load test of jobs.
- **Risks:** hostile files; compute cost; elevation accuracy.
- **Done:** hostile corpus fully rejected safely; EXIF GPS verified absent from public variants; GPX download passes validation in two third-party GPS apps.

## M5 — Submission workflow
- **Scope:** multi-step wizard, drafts/autosave, previews, duplicate warnings, access/evidence form, submission status, edit and resubmit, contributions page.
- **Dependencies:** M3, M4.
- **Deliverables:** complete contributor journey up to "In review".
- **Testing:** e2e submit journey on mobile; draft recovery; validation messaging; interruption/resume (lost connection).
- **Risks:** form abandonment; low-quality submissions.
- **Done:** ≥ 70% of test submissions from usability sessions pass validation first time (calibrated on first usability round).

## M6 — Moderation and publication
- **Scope:** queue, review panel, approve/request changes/reject/publish-limited, access verification with expiry, two-person rule, condition events, audit log, user management, notifications to contributors and savers, expiry sweep job.
- **Dependencies:** M5.
- **Deliverables:** closed loop: submit → review → publish → report → correct.
- **Testing:** lifecycle state-machine tests; audit-log completeness; role and scope tests; e2e moderation journey; load of queue with 500 items.
- **Risks:** moderator workload; process gaps.
- **Done:** two moderators complete a full review cycle in staging using the real checklist; every action appears in the audit log.

## M7 — Hardening and beta
- **Scope:** security review (threat-model walk-through, dependency audit), performance tuning, accessibility audit, copy review, empty/error states, observability and alerts, backups and a restore drill, legal text, responsible-riding content, invitation-only beta with Club Myto; **switch media and GPX storage to Cloudflare R2** (adapter swap, copy test files, update link signing; earlier if traffic forces it); **move production to paid plans** (Supabase Pro, a commercial Vercel plan; free tiers pause projects and have no backups); `/donate` page with a hosted payment link; "subsidiary of myto-moto" statements in the footer, About and legal pages; accountant confirmation on GST and overseas payments.
- **Dependencies:** M6; legal review.
- **Deliverables:** beta release, runbooks, status/feedback channel.
- **Testing:** penetration-style test of uploads and RLS; WCAG 2.2 AA audit; real-device tests on low-end Android and iOS Safari; backup restore drill.
- **Risks:** late legal feedback; moderator capacity.
- **Done:** no open critical/high issues; restore drill succeeded; success-metric instrumentation live.

## M8 — Public launch
- **Scope:** open registration and submissions with caps for new users; announcement; Journal cross-links; monitoring.
- **Done:** metrics dashboard tracks the doc 02 indicators; first monthly access-accuracy audit completed.

## Companion stage (after the web MVP; see doc 14)

### M9 — Public API
- **Scope:** `/api/v1` read and write endpoints (trails, saved, submissions, uploads, reports), OpenAPI description, token auth (OAuth + PKCE for the app, revocable device tokens for Navi), idempotency keys, delta-sync by `content_revision`, per-device rate limits.
- **Dependencies:** M6, M8. **Testing:** contract tests, authorisation tests per scope, retry/idempotency tests, load test. **Risks:** API surface creeping; leaking evidence or contacts through a new DTO. **Done:** a reference client can sign in, list Saved trails, submit a draft and download a GPX.

### M10 — Recording spike, then Trails app
- **Scope:** first a throwaway spike of background recording on real budget Android phones (Xiaomi/Oppo/Vivo/Samsung) and iOS while Google Maps navigates in the foreground; then choose the framework and build recording, crash-safe local storage, trimming, waypoints/photos, offline queue, resumable upload to a draft submission.
- **Dependencies:** M9; store developer accounts. **Testing:** multi-hour ride tests per device, battery impact, app-killed recovery, no-signal queueing, store review dry run. **Risks:** OEM battery killers, store background-location review, two clients to maintain. **Done:** a recorded ride arrives as a draft on the web with correct stats and no data lost on a forced app kill.

### M11 — Navi integration
- **Scope:** agreed GPX export tested on a Navi unit; "Send to Navi" share/deep link; Saved trails sync and offline packs; stale-copy detection; Navi-recorded rides and field closure reports via the API (SIM connectivity, offline-first).
- **Dependencies:** M9, Navi team, Navi hardware access. **Testing:** on-device tests; offline/online transitions; revoked-token behaviour. **Risks:** unknown Navi GPX capabilities; brand tension between "without limits" and responsible riding (doc 13). **Done:** a Saved trail appears on Navi offline with its access status and verification date.

## Stage 2 and 3 backlog (not scheduled)
Collections and completed trails; update notifications by email/push; community-suggested corrections; richer elevation analytics; route comparison; contributor reputation; regional moderators; self-hosted tiles; dark map theme; Hindi; route planning; GPS-device formats; riding statistics; group trip planning. (Offline packs, the Trails app and Navi integration are scheduled in M9–M11 above.)

## Explicitly NOT in the first release
Star ratings and reviews; comments and social feed; user-to-user messaging; ride recording (companion stage, M10); turn-by-turn navigation; offline use (M11); payments or monetisation beyond the hosted donate link; weather forecasts; multiple collections UI; completed-trail tracking; badges or leaderboards; automatic scraping or import of third-party trail data; a public API (M9); native apps (M10); AI-generated trail descriptions; multilingual UI.
