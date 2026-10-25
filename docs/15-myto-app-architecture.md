# 15 — The Myto app: architecture

One phone app, **Myto**, that holds everything a rider does around a ride: find a trail, plan the trip, ride it, record it, keep notes, and ride with a club. Moto Trails stays the website and the system of record for trail data; the app is its most important client. This document extends [14 — Platform contract](14-platform-contract.md) (which covers the API, GPX export, recording and Navi) from "a recording companion" to the full app. Planning only; nothing here is built. Items marked **(open)** need a decision or a fact we do not have. Prices, quotas and store rules are not verified here.

> **Update (25 Oct 2026):** the navigation in §1 and §4.2 (five tabs) and the framework detail in §4.1 are superseded by [16 — The Myto app: UI, navigation and tech stack](16-myto-app-ui.md): four tabs (Home, Trails, Clubs, You) plus a raised Record button. The rest of this document still stands.

## 1. What the app is for

A rider's day has five phases. The app has one tab for each, so nothing needs a second app.

| Tab | Job | Examples |
|---|---|---|
| **Trails** | Find and keep trails | Search, near me, saved, offline packs (map + route + access status), conditions, send to navigation |
| **Plan** | Get ready | Checklists and to-dos, packing lists, trip plans, service and document reminders |
| **Ride** | Be on the ride | Record, navigate the saved route, hydration and break reminders, voice notes, waypoints, SOS |
| **Club** | Ride with people | Clubs, ride plans, Going/Maybe, group packing list, optional live location for one ride |
| **Me** | Keep a record | Ride log and stats, notes and recordings, garage (bikes, service history), account, privacy, devices |

**Principles** (these extend doc 14 §2):
1. **Local first.** Everything a rider needs on the ride works with no signal: trails, the plan, recording, notes, reminders. The server is for backup, sync and sharing.
2. **Private by default.** Rides, recordings, notes and documents belong to the rider and are never shown to anyone until they choose to share.
3. **Safe while moving.** Nothing on the ride screen needs two hands or more than a glance. Reminders prefer audio through a headset; the app never asks for input while the bike is moving.
4. **Access travels with the trail.** Wherever a trail appears, its access class, condition and verification date appear with it (doc 14 §2.4). The app never labels a restricted or unverified trail as open.
5. **One account, one backend.** The app signs in with the same account as the website; there is no second user system.

## 2. Recommended features, in priority order

**Core (the first release):**
1. Trails: browse, search, near me, saved, offline pack per trail, GPX to other apps.
2. Ride recording that survives the background and a long day (§6).
3. Checklists and to-dos with templates (pre-ride, packing, bike check), reminders, repeats.
4. Hydration and break reminders during a ride (§7).
5. Voice notes and text notes, pinned to a ride and a place; waypoints with photo.
6. Ride log: distance, moving time, elevation, a map of every ride.
7. Sign-in with the website account (magic link), device list, delete everything.

**Next:**
8. Offline maps for a region (self-hosted vector tiles).
9. Submit a ride as a draft trail (the pipeline already exists; doc 14 §5).
10. Live conditions: one-tap check-ins after a ride (see the web design for conditions).
11. Club: ride plans, group checklist, push notifications, ride chat later if there is demand.
12. Garage: bikes, service intervals ("oil due at 6,000 km"), expiry reminders for insurance, PUC and licence.
13. SOS and safety: a check-in timer ("tell me if I am not back by 5 pm"), crash detection prompt, share my live location with one chosen contact for the duration of a ride.

**Later, once there is demand:** group ride live map, fuel and expense log, weather on the route, fuel stops and repair shops near a trail, trip photo album, ride-share cards for WhatsApp and Instagram, Myto Navi pairing (§11), a link to the Myto shop (gear, accessories).

**Deliberately not in the first release:** chat, public social feed, public leaderboards (they reward speed and risk), selling or advertising to riders, anything that shares exact location of a sensitive trail.

## 3. System overview

```
                  ┌──────────────────────────── Myto app (phone) ────────────────────────────┐
                  │  UI modules:  Trails │ Plan │ Ride │ Club │ Me                           │
                  │  ───────────────────────────────────────────────────────────────────────  │
                  │  Local database (SQLite)  ·  Sync engine  ·  Recorder service            │
                  │  Local notifications  ·  Offline map packs  ·  Audio capture             │
                  └───────────────┬─────────────────────────────────────┬────────────────────┘
                   REST /api/v1 (JSON, OpenAPI)                  signed upload URLs
                                  │                                      │
        ┌─────────────────────────▼──────────────┐             ┌─────────▼──────────┐
        │  Web app + API  (Next.js, Vercel)       │             │  Object storage    │
        │  public trail queries · app (personal)  │             │  Cloudflare R2     │
        │  API · moderation · Club · jobs         │             │  public: photos,   │
        └─────────────────────────┬──────────────┘             │  tiles · private:  │
                                  │                            │  recordings, GPX   │
                  ┌───────────────▼────────────────┐           └────────────────────┘
                  │  PostgreSQL + PostGIS (Supabase) │       Push: FCM (Android) / APNs (iOS)
                  │  schema `public`: trails, Club  │       Email: Resend
                  │  schema `app`: personal data    │
                  └─────────────────────────────────┘       Other clients: website, Myto Navi
```

**One backend.** The website and the API stay one Next.js application on one database (a modular monolith). The app does not need its own server for now; it gets new personal-data routes in the same v1 API. A separate service is worth the cost only if a part needs different scaling (transcription, live location) or a different team.

## 4. The app

### 4.1 Framework (decision needed, spike first)

| Option | For | Against |
|---|---|---|
| **React Native with Expo (development builds)** | One language (TypeScript) with the website; reuse `packages/domain`, the Zod schemas and the generated API client; fastest to build; over-the-air updates for fixes | Background location and audio need native modules; a little more work to get long recordings reliable |
| Flutter | Excellent performance and UI consistency | Dart: nothing shared with the web code; a second skill set |
| Native Kotlin + Swift | Best control of background services | Two apps, double the work |

**Recommendation: React Native (Expo, with a custom development build)**, subject to the recording spike in §12. If the spike shows the Android foreground service cannot be made reliable in React Native, write that one service as a small native Kotlin module and keep the rest. Doc 14 already says the framework is decided after the recording spike; this keeps that rule.

### 4.2 Structure

The app is a shell with **modules**, one per tab. A module owns its screens, its local tables, its sync rules and its API calls, and talks to other modules only through a small set of shared services (auth, sync, location, notifications, storage). This is what lets "everything in one interface" grow without becoming tangled: a new module (Garage, Shop) is added without touching the others, and can be switched off remotely.

- **Navigation:** five tabs; a persistent **ride bar** (when recording) that opens the Ride screen from anywhere.
- **Deep links:** `myto://trail/<slug>`, `myto://ride/<id>`, `myto://club/<id>`, plus universal links from `moto-trails.com` and `myto-moto.com` so shared links open the app.
- **Design system:** the existing tokens (`packages/tokens`) converted to a TypeScript theme, so the app looks like the site. Large touch targets, glove-friendly, high contrast in sunlight, a dark mode for night rides.
- **Accessibility:** screen-reader labels, dynamic type, no information by colour alone (same rules as the web).

### 4.3 Local data and sync

- **Local database:** SQLite on the phone, the source of truth for what the rider sees. Reads never wait for the network.
- **What syncs:** personal records only (checklists, notes, recordings, rides, reminders, bikes, saved trails). Public trail data is a read cache with a version number per trail (doc 14 §6).
- **Sync protocol:** every record has a client-generated id, an `updated_at` and a soft-delete flag. The app pushes batches of changes with idempotency keys (`POST /sync/push`) and pulls changes since a cursor (`GET /sync/pull?cursor=`). The server assigns a revision.
- **Conflicts:** a rider's personal data has one writer at a time, so **last write wins per record** is enough; no merge engine. The exceptions (a shared Club checklist, two phones) use per-field last-write-wins plus a visible "edited on another device" marker. CRDTs are not worth their complexity here.
- **Large files:** audio and photos upload in the background through signed URLs, with resume, only on Wi-Fi if the rider chooses.
- **Quotas:** per-user storage cap (for example 1 GB) with a clear screen showing what uses it and one-tap cleanup.

### 4.4 Authentication

- The website signs in by email link. The app reuses it: the rider enters their email, the link opens the app (universal link), and the app exchanges it for a **device token** with scopes. The existing token system (hashed, scoped, revocable, listed at *Account → Connected devices*) already does the server side.
- Tokens live in the phone's secure storage (Keychain / Keystore). Optional app lock with fingerprint or face.
- The app shows the same 18+ and licence declaration as the website before any community feature.
- Shared sign-in with the Myto shop at `myto-moto.com`: see §4.5 (recommended: one identity, each backend checks the token locally).

### 4.5 One identity across Trails and the Myto shop

The Myto shop repo (`myto-moto`, read on 25 October 2026) has its own accounts and orders, and the Trails site has its own. Facts that matter, from reading both:

| | Myto shop | Trails |
|---|---|---|
| Sign-in | Supabase Auth: email and password, email confirmation, reset links | Own email-link sign-in, sessions in our own tables |
| Accounts | `auth.users` plus `customer_profiles` (name, phone) | `app_user` (opaque public id, 18+ declaration, privacy choices) |
| Orders | Guest checkout first; `orders.customer_email` is the only link to a person (no customer id); a logged-in user sees orders whose email equals theirs | none |
| Payments | Razorpay, verified on the server | none (donations later) |
| Admin | One shared password and a signed cookie (`ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`) | Per-person roles with an audit log |
| "Club" | "Club Myto" is a marketing page for a WhatsApp group | Club is clubs, join requests, ride plans (a different thing) |

**What you want:** keep the two products and databases separate, and pull shop data by email only when needed. **The problem you spotted is real:** if each system re-checks who the person is, the app signs in twice, every request pays for two checks, and email becomes a fragile join key (aliases like `a.b@gmail.com`, plus-addresses, a changed email, a stranger who signs up with someone else's address).

**The way out is to separate identity from data:**
1. **Identity is decided once**, by one sign-in, and carried as a signed token (a JWT).
2. **Each backend checks the token locally**, by verifying a signature against a public key it has cached. That is a few microseconds and needs no call to the other system.
3. **Data stays where it lives.** Trails never reads shop data and the shop never reads Trails data. When a screen needs shop data (orders), the app asks the shop's own API with the same token.

**Options compared**

| Option | Sign-ins | Checks per request | Coupling | Verdict |
|---|---|---|---|---|
| A. Keep both logins, join by email | Two (or a hidden second one) | Token check on each side, plus an email match, plus a server-to-server call for orders | Low | What you feared; email is a weak key. Fine only as a stop-gap |
| B. Link accounts once ("Connect your Myto account"), then server-to-server | Two, linked | One token check; orders via a service call per screen | Low | Workable, but the app still holds two sessions |
| **C. One identity provider; both backends accept its token** | **One** | **One local signature check** | Medium (both depend on one login service) | **Recommended** |
| D. Merge into one database | One | One | High | No: it ties two products together, and the data and privacy rules differ |

**Recommendation: C, with the shop's Supabase Auth as the single identity ("Myto ID").** It already holds the customers, passwords and verified emails, and covers people who buy but never open Trails. Both products stay separate apps with separate databases.

**What a request costs under C**

| Check | How it is done once |
|---|---|
| Who is this? | The app signs in once (Supabase's PKCE flow, which works in React Native). Every call carries the token. Each backend verifies the signature locally against cached public keys. |
| Is the email real? | The token says `email_verified`. A link between systems is only made for a verified email, and never re-checked per call. |
| Which Trails account? | `app_user.auth_sub` stores the token's stable user id (not the email). It is found in the same query that already loads the user. |
| Is this user allowed here? | Authorisation stays local: Trails checks `app_user.status`, roles and the 18+ declaration in its own database, as today. Suspending someone on Trails works at once and needs no call to the shop. |
| Orders or shop data | The app calls the shop's API with the same token. Trails is not involved, so there is no server-to-server hop. |
| Shop facts Trails needs (for example "owns a Myto Navi") | A custom claim added to the token at sign-in, so there is still no extra call. |

So each request costs one signature check plus the database lookup it already needed. Cross-system calls only happen when a screen shows the other product's data, and then they are one hop, cached.

**What changes in each repo**
- **Shop (`myto-moto`):** switch Supabase to asymmetric token signing and publish its keys; add a small API for the app (`GET /api/me/orders`, `GET /api/me/orders/{id}`) that reads the bearer token and returns the same data the account page shows; add a sign-in hook for the claims; confirm that email confirmation is required (the sign-up screen says it is, but the setting must be verified); keep the order-by-email logic **inside the shop only**, and match on the verified email lowercased. Later, replace the shared admin password with named admin users.
- **Trails:** accept Myto ID tokens in the API (the token check replaces our own session check, same shape as the device-token check we already have); add `app_user.auth_sub`; on a first sign-in with an existing email, link the old account once (matching on a verified email), then store the id; keep our own device tokens only for Myto Navi, which has no browser, minted after the rider approves the device.
- **App:** one sign-in screen; one token; two base URLs (`moto-trails.com/api/v1` and `myto-moto.com/api`).
- **Web sign-in:** Trails keeps its email-link login until the app ships, and then it is replaced by "Sign in with Myto" so the two products behave the same.

**Edge cases and rules**
- **Never trust an unverified email.** If someone can sign up with another person's address and see that person's orders, the join is an account takeover. Only a verified email can see orders; the shop's guest orders become visible only after the owner confirms the address.
- **Email changes and aliases.** Link on the stable user id, not the email; email is a hint for the one-time link only.
- **Deleting an account.** The shop deletes the identity; a webhook tells Trails to remove or anonymise the person's Trails data (clubs, comments, questions) according to the data-protection rules in §10. The reverse (deleting on Trails) removes only Trails data.
- **Token lifetime.** Short access tokens (about an hour) with refresh; sign-out everywhere revokes the refresh tokens.
- **If the shop's login is down,** a signed-in app keeps working until the token expires, and offline features never need it; new sign-ins wait. Both products are yours, so this is an operations risk, not a trust risk.
- **Names.** Rename the app tab to "Clubs" (or keep "Club" and call the shop's page "Club Myto, the WhatsApp community") so riders do not confuse a ride club with the WhatsApp group; the app can link to Club Myto as one entry.
- **Shop checkout in the app.** Open the shop's own checkout in the browser (Razorpay stays where it is). Physical goods are not subject to the store's in-app-purchase rule, but check the current store terms before launch.

**Stages**
1. **Now:** nothing changes for riders. Add `app_user.auth_sub` (empty) and write the shop's `/api/me/orders` behind a feature flag.
2. **With the app's first stage (S1):** switch the app and the Trails API to Myto ID tokens; migrate existing Trails accounts by verified email.
3. **After:** switch the Trails website sign-in to Myto ID; remove our own session code; add the order list to the app's Me tab.

**Decided: the shop and Trails are on different Supabase projects.** That fits the plan (separate databases) and means Trails must **trust tokens issued by the shop's project**:
- **How Trails verifies:** it fetches the shop project's public keys from its JWKS address (`https://<shop-project>.supabase.co/auth/v1/.well-known/jwks.json`), caches them, and checks every token's signature, expiry, issuer (that exact project URL) and audience (`authenticated`). A token from any other project or issuer is refused. One small library (`jose`) does this; no call to the shop per request.
- **The condition (open, must be checked first):** local verification needs the shop project to sign tokens with an **asymmetric key** (Supabase calls them JWT signing keys: ES256 or RS256). Older Supabase projects sign with one shared secret (HS256); then Trails could only verify by holding that secret, which would let Trails mint shop tokens. That is not acceptable, so the shop project must be switched to asymmetric signing before any of this. Where to look: shop project dashboard, Project Settings, JWT Keys. I have not seen that project, so this is unverified.
- **Claims Trails relies on:** `sub` (stable user id) and `email`. Supabase does not put a top-level "email is verified" claim in the token, so the shop adds one with a **custom access token hook** (a small database function): `email_verified = (auth.users.email_confirmed_at is not null)`. Trails refuses tokens without it, and refuses anonymous sign-ins (`is_anonymous`).
- **No cross-project database access.** Trails never connects to the shop's database and the shop never connects to Trails'. The only things crossing are tokens (signed, checked locally) and the shop's order API, called by the app.
- **Unlink path.** `app_user.auth_sub` can be cleared, and Trails keeps working with its own sign-in until the switch, so this can be rolled back at any stage.

**Still open:** (1) Is the shop's Supabase happy to be the identity for everything, and who on the Myto side owns that project? (2) Which Supabase Auth settings does the shop use today: are sign-ups open to anyone, is email confirmation required, and what are the password rules?

## 5. Backend additions

New personal-data tables live in a separate Postgres schema (`app`), so the boundary from public trail data is visible and enforceable. All are row-level-secured by owner, private by default, never exposed through public views, and covered by the same tests style as the Club tables.

| Table | Purpose |
|---|---|
| `app.ride` | A recorded ride: summary, simplified line, full track in private storage, source device, trim applied |
| `app.waypoint` | Gate, water, hazard, viewpoint; optional photo |
| `app.note`, `app.recording` | Text notes; audio files with duration, transcript (optional), pinned point |
| `app.checklist`, `app.checklist_item`, `app.checklist_template` | To-dos, packing lists, templates, repeat rules |
| `app.reminder` | Time, interval and ride-aware reminders (hydration, breaks, service due) |
| `app.bike`, `app.service_log`, `app.document` | Garage: bikes, service history, document expiry dates (the file itself stays on the phone unless the rider backs it up) |
| `app.sync_cursor`, `app.device` | Sync bookkeeping and the device list |
| `app.safety_contact`, `app.checkin_timer` | SOS and "tell my contact if I am not back" |

**API:** additive v1 routes under `/me/...` and the two sync routes; the existing public, saved, uploads and submissions routes are reused as they are. The OpenAPI document already exists and generates the typed client (`packages/api-client`) the app and the web share.

**Jobs:** cron or queue for transcription, overdue check-in timers, cleanup of expired data, push delivery. The same job runner serves the website (the phone-number cleanup already runs this way).

## 6. Recording and navigation (the hard part)

Doc 14 §5 already specifies the behaviour. The architecture adds:

- **Android:** a foreground service with a persistent notification; battery-optimisation guidance per manufacturer (Xiaomi, Oppo, Vivo, Samsung and OnePlus kill background work most). Points are **written to the local database every few seconds**, so a crash or a killed app loses seconds, not the ride. On restart the app offers to resume.
- **iOS:** "Always" location with the background mode; a visible blue bar is normal.
- **Quality:** accuracy filter, smoothing, auto-pause, barometer elevation, battery-aware sampling, a battery estimate for the ride.
- **Navigation:** follow a saved route on an offline map with a "back on route" cue; turn-by-turn is not in scope. Handing off to Google Maps for road navigation stays supported.
- **Maps:** MapLibre Native with **vector tiles we host** (OpenStreetMap-derived, in one file per region on R2, built by an open-source tile builder). Offline packs download per region. R2 has no download fees, which is why it fits. Licence terms and attribution for OpenStreetMap data must be shown (open: confirm exact wording before launch).
- **Privacy:** raw tracks are private; trim handles remove the start and end before anything is shared or submitted (the same rule as the web GPX trim).

## 7. Reminders (hydration, breaks, service)

- **Local notifications** carry the reminders, so they fire with no signal and need no server.
- **Hydration and breaks:** during a recording, the rider sets an interval (default 20–30 minutes). Reminders are **ride-aware**: shorter on hot days, skipped when the bike is not moving, and delivered as a sound or voice cue through a Bluetooth headset when one is connected, with a plain notification otherwise. The message says "when it is safe to stop"; the app never asks for a tap while moving.
- **Plan reminders:** checklist due times, "charge the camera tonight", repeating service and document dates.
- **Push** (Firebase Cloud Messaging on Android, Apple Push on iOS, through Expo's service to start with) is only for things that come from others: a Club ride tomorrow, a question answered, a saved trail reported closed.
- **Responsibility note:** reminders are helpful, not safety-critical. The app says so, and tells riders not to rely on it for medical or heat-stress decisions.

## 8. Notes and recordings

- **Voice notes** record locally (compressed audio), attach to the ride and the GPS point where they started, and upload in the background to private storage.
- **Hands-free:** a large single record button on the ride screen, a volume-key or headset-button shortcut, and a voice cue when it starts and stops.
- **Transcripts:** speech-to-text on the device first (no audio leaves the phone for it); a server option later, and only with consent. Transcripts are searchable.
- **Other people's voices:** a recording can capture friends or strangers. The app shows a short reminder to tell people they are being recorded, never shares a recording by default, and lets the rider delete any recording and its transcript.
- Notes can be turned into the description, safety notes or hazard waypoints of a trail submission.

## 9. Club inside the app

The web Club (clubs, join requests with a phone number for admins, ride plans, Going/Maybe, posts) is reused through the same API, so the app and the website show the same clubs. New in the app: push notifications, ride plans in the calendar, a group checklist for a ride, and an **optional live location for one ride** (opt-in each time, visible only to people who joined that ride, stops at the end time, never stored after it ends). Chat stays out until there is demand.

## 10. Privacy, safety and law

This app collects the most sensitive data the project has seen: movement, home and work patterns, voice, documents.

- **Data protection law (India, Digital Personal Data Protection Act 2023):** get clear consent for each purpose, collect only what is needed, let riders see, export and delete their data, keep it no longer than needed, and have a way to report a breach. Needs legal review before launch (open).
- **Location:** foreground and background permission asked only when the rider starts a ride, with the reason in plain words; store policies require a written justification and sometimes a video for background location.
- **Retention:** raw tracks and recordings are kept until the rider deletes them or closes the account; an "erase everything" button is one tap and really erases.
- **Encryption:** HTTPS everywhere, encryption at rest in the database and storage, secure storage for tokens. End-to-end encryption of personal data is possible later and is a trade-off (no server search, no recovery).
- **Analytics and crash reports:** off until the rider agrees; no advertising identifiers.
- **Documents:** insurance and licence files stay on the phone by default (expiry dates sync, the files do not).
- **Safety claims:** the SOS and check-in features do not replace emergency services; the app must say so, and test them on real devices before promising anything.

## 11. Myto Navi

Navi is a separate device with its own team (doc 14 §6). The app is the bridge: **Level 2** "Send to Navi" and **Level 3** account sync from doc 14 use the same API and the same offline pack format as the phone. Whether the app also runs on Navi hardware (it is Android) is **(open)**; the module structure makes a reduced "Navi mode" (Trails, Ride, no touch-heavy screens) possible later.

## 12. Delivery plan

| Stage | What | Gate |
|---|---|---|
| **S0 Spike** (2–3 weeks) | Recording reliability on 5 real Indian phones across brands, a 4-hour ride each; offline MapLibre with a region pack; voice recording; sync of one table | Recording loses under 1% of points and survives a lock screen and battery saver |
| **S1 Shell + Trails** | Sign-in, tabs, trails browse/search/saved, offline pack, GPX out, device list | Beta on 20 riders |
| **S2 Plan** | Checklists, templates, reminders, local-first sync | Works with no signal end to end |
| **S3 Ride** | Recording, ride log, voice and text notes, waypoints, hydration reminders, submit as a trail draft | A full day's ride recorded and uploaded |
| **S4 Club + conditions** | Club in the app, push, group checklist, live conditions check-ins | Push delivery measured |
| **S5 Garage + safety** | Bikes, service log, document reminders, check-in timer, SOS contact | Reviewed by someone who knows emergency services |
| **S6 Navi** | Pairing, offline pack format agreed with the Navi team | Tested on a real unit |

**Testing:** unit and component tests as on the web; end-to-end flows with Maestro on real devices; a field-test group with a feedback button in the app; crash reporting with consent.

**Release:** Google Play first (most riders in India use Android) and the Apple App Store when ready; staged rollout; over-the-air updates for fixes that do not need a store review. Needs developer accounts for both stores (Apple's annual fee and Google's one-time fee, not verified here) and a privacy policy that covers the app.

**Repository:** `apps/mobile` (Expo) beside `apps/web`; shared `packages/domain`, `packages/tokens`, and the new `packages/api-client`.

## 13. Decisions needed

1. **Platforms first:** Android only first (my recommendation, most riders), both together, or iOS first?
2. **Accounts:** one sign-in ("Myto ID") for the app, the Trails website and the Myto shop, with the shop's Supabase as the identity and both products keeping separate databases (§4.5)? The shop and Trails are on different Supabase projects (decided); is the shop's project switched to asymmetric signing keys?
3. **First release scope:** the seven "Core" items, or fewer? (I would start with Trails, Plan and Ride, and add Club after.)
4. **Voice notes:** on-device transcription only, or also a server option later?
5. **Live location in a Club ride:** include in the first Club release, or leave out until the privacy review?
6. **Navi:** should the app also run on Navi hardware, and who on the Navi team owns it?
7. **Money and people:** developer accounts, map tile hosting, push, and who tests on real phones. I can write and test the code; I cannot test on physical Android phones or an iPhone from here, and the recording spike depends on exactly that.

## 14. Main risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Background recording on Indian Android phones | The core promise; manufacturers kill background apps | Spike on real devices first; foreground service; write points often; per-brand guidance |
| Store approval for background location | Can block release | Written justification, a short demo video, a visible reason in the app |
| Scope creep ("super app") | Many modules can mean none is good | Ship tabs one by one; each module has its own gate |
| Privacy and law | Movement, voice and documents are sensitive | Private by default, consent per purpose, legal review, one-tap erase |
| Safety and liability | Reminders and SOS can be relied on | Clear wording, no safety claims we cannot test, field tests |
| Map cost and licence | Offline maps are large | Self-hosted tiles on R2, regional packs, attribution shown |
| Two clients to keep in step | Web and app can drift | One API and one set of shared schemas; OpenAPI is the contract |
