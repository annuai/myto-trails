# 0011: Fix it lives in the database and R2, and is kept on the phone

Date: 2026-11-04 · Status: accepted (replaces the first version of this decision, which bundled the guides in the app)

**Decision.** Repair guides, steps, plain-word terms, the pre-ride check items and the toolkit are rows in the database (`fixit_guide`, `fixit_step`, `fixit_term`, `fixit_check_item`, `fixit_tool`, `fixit_art`; migration 0038). Pictures are WebP widths in R2 under `public/fixit/<guide>/<slot>-<width>.webp`. The app ships no guides of its own: it downloads one document from `GET /api/v1/fixit` when it starts (and when Fix it is opened), keeps it on the phone, and asks again when it is more than six hours old. The first version of the content (`packages/domain/src/fixitContent.ts`) loads the database once with `npm run fixit:import`; after that the database is the source of truth and edits are made there. There is still no new tab (ADR 0009).

**Why.** Guides must be corrected without shipping a new app: a mechanic's review, a better step, a new bike. The database gives that. A repair is needed where there is no signal, so the document is kept on the phone after the first download. The cost of having no copy in the app is that a phone that has never been online shows "Guides not downloaded yet" with a Try again button, until it has been online once.

**Safety of edits.** The database refuses a guide with fewer than two "stop and get help" lines, and a review that has a name but no date. The importer checks every step is short enough to read with gloves on. The app ignores a fetched document that is malformed and keeps the one it has, so a bad edit cannot blank the guides. `review` stays empty until a mechanic has really checked a guide; the app says "Not yet checked by a mechanic" until then.

**Re-running the import** only adds what is missing and never overwrites an edit. `--overwrite` replaces guide text but keeps the review, the published flag and uploaded pictures.

**Pictures.** Optional: a guide reads fully without them. `npm run fixit:art` uploads them with no app change. The app keeps them on the phone for offline use.

**Not now.** Guides per bike model, guides in other languages (the rows are keyed by id, so a language column can be added), community-written guides (they need the moderation flow trails use), a mechanic directory, an admin screen (edit with SQL or the Supabase table editor for now).

**Reversal.** Remove the entry points and the route; drop the six tables.
