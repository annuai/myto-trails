# 16 — The Myto app: UI, navigation and tech stack

Design for the phone app described in [15 — Myto app architecture](15-myto-app-architecture.md). **This document replaces doc 15's navigation (§1 five tabs, §4.2) and its framework choice detail (§4.1)**; everything else in doc 15 (sync, recording, privacy, backend, delivery) still stands. Planning only: nothing here is built except a throwaway click-through, [`prototype/myto-app.html`](prototype/myto-app.html) (sample data; open it in a browser). Choices marked **(my call)** were not decided by the owner. Items marked **(open)** need a decision or a real-device test.

Sources: three design reviews run on 25 October 2026 (navigation and UX, tech stack, design system), the owner's six screenshots of the Ather app, and docs 03, 09, 14, 15. Library versions and prices were checked on the web on that date by the review; **recheck before the spike**.

## 1. Intent

One app for the whole of a ride: find a trail, get ready, ride and record, look back, ride with a club. Fast, simple, not cramped. The owner likes Ather's app: lots of white space, one large hero number per screen, soft rounded cards, a light home and dark stats screens.

**Goals:** glanceable; one-handed and glove-friendly; works with no signal; looks like the same family as Moto Trails and the Myto shop.
**Non-goals (v1):** chat, public feed, leaderboards, turn-by-turn road navigation, anything that shows the exact location of a sensitive trail.
**Anti-goals:** a "super app" where no module is good; a screen that needs two hands or reading while the bike moves; colour as the only signal.

## 2. Navigation

**Four tabs and one action:**

`Home` · `Trails` · **Record** (raised centre button) · `Clubs` · `You`

| Item | Job |
|---|---|
| **Home** | What is next. Next trip with packing progress and offline status, due-soon list, trails near you, latest ride |
| **Trails** | Search, near me, filters, saved, offline packs; trail detail with access first |
| **Record** | Get ready, start, ride. The most time-critical action, so the biggest target in the app |
| **Clubs** | Clubs, ride plans, Going or Maybe. Plural, so it is not confused with the shop's "Club Myto" WhatsApp page (doc 15 §4.5) |
| **You** | Totals line, ride log, notes and recordings, garage, safety contact, offline packs, settings, privacy, erase everything |

**Why not the owner's four (Dashboard, GPX recorder, Trails, Club):** a combined Dashboard mixes history, planning and preparation, and is empty on day one; "GPX" is a file format, not a rider's job (label it Record); and settings, privacy, garage and safety would have no home. Doc 15 §10 needs a one-tap erase and a device list. **Decided by the owner, 25 October 2026: four tabs plus a raised Record button.**

**Why not five tabs (doc 15):** a separate Plan tab is folded into Home (next trip and due-soon), which removes a tab without losing a feature.

**Rules**
- While recording, the live screen is full screen with **no tab bar**. Elsewhere, a 56 px **ride bar** sits above the tab bar (recording dot, time, distance, Open). Reopening the app during a ride lands on the live screen.
- First screen: Home if there is an upcoming trip or an unfinished ride; Trails for a new account.
- Notifications are a bell on Home, not a tab. Search is the first thing on Trails.
- Safety is never behind a tab: SOS lives on the live screen, the contact and check-in timer in You, the timer started from Record.
- Every swipe has a visible button. No gesture is the only way.

Club depth is v1-light: the web Club view, Going or Maybe, one push for tomorrow's ride. Group checklist, chat and live location wait for the privacy review (doc 15 §13.5).

## 3. Visual language

**"Survey sheet" for the web, "soft survey" for the app.** Keep Myto's paper, ink, survey blue and status colours; take Ather's structure: soft rounded cards on a quiet background, one hero per screen, big numerals, generous space. The web's hairline-only, no-card rule is dropped on phones (hairlines vanish in sunlight and with gloves). Brand red stays out of the UI.

**Colour** (light values are from `packages/tokens`; dark and tints are new)

| Token | Light | Dark |
|---|---|---|
| paper (screen) | `#f2ede8` | `#121211` |
| card | `#fbf9f6` | `#1c1c1a` (raised `#242422`) |
| ink / text | `#1a1a1a` | `#f2ede8` |
| muted | `#6b6560` | `#a8a29b` |
| accent (survey blue) | `#1f4a6b` | `#8fbbdc` (text on it `#121211`) |
| good / caution / stop | `#2d6a3e` / `#8a5a00` / `#a32d1c` | existing `-dark` tokens |
| route-art tints (decor only) | sand `#e8dccb`, sage `#cfe0c8`, clay `#efcfc2`, sky `#cfdde8` | same, dimmed in dark |

The review computed contrast for these (text ≥ 4.5:1) but **nothing has been tried on a phone in sunlight (open)**. The web's dark mode only defines status colours, and its accent is 1.83:1 on dark, so the dark accent above is required before any dark screen ships.

**Light for planning, dark for riding.** Home, Trails, Clubs, You are light. Record (live) and Ride story are dark, bold and high contrast, like Ather's stats screens. An ambient or user switch can darken everything at night.

**Type.** Geist for text, Geist Mono (tabular) for every number and unit, Michroma only for the wordmark. Screen title 30/600; section heading 18/500; body 17; label 15 (minimum); caption 13. Live screen: hero 88, secondary 44. Support system font scaling to about 130%. Sentence case.

**Shape and space.** Cards 24 radius, controls and buttons 16, chips pill. Screen margin 20; gap between sections 32; card padding 20 to 24. No shadows except the ride bar, the Record button, sheets and map controls. Pressed state is a tinted fill.

**Touch targets.** Browse 48 minimum, buttons 56, Record button 76 (raised), live screen buttons 88 high, stop and SOS require a held press. This is larger than the web's 44. Status is always symbol plus word plus colour.

**Radii note.** The docs say 0/2/4 radii but `packages/tokens/src/trails.css` ships 0/8/16/24/32. The app uses the shipped scale. **Decide which is canonical for the web (open).**

## 4. Components

Port as logic, rebuild in React Native (do not import web components):

| Component | Notes |
|---|---|
| StatusChip | Glyph, word, colour; the word is mandatory. Share `status-map.ts` (move it from `apps/web/src/ui/StatusBadge` to a shared package) |
| GoNoGoStrip | Three rows in decision order: access, condition, verified date |
| HeroCard | Label, one big line or numeral, chips, progress bar, one primary button |
| TrailRow / TrailTile | Route-art thumbnail, name, mono stats, status chip; tile is the horizontal-scroll form |
| RouteArt | The track's simplified line on a tint; also used on tiles in Ride story and Latest ride |
| ListCard | Rows with 56 minimum height and a label left, value right |
| Banner | Dark card for something the rider must act on (stale pack, sync problem) |
| BottomTabBar, RecordButton, RideBar | As section 2; Record is the raised accent circle |
| LiveStat | Label, mono value, unit; GPS-lost shown as icon plus word |
| HoldButton | Stop and SOS: a fill ring over 1 s (SOS 2 s), haptic |
| OfflinePackRow | Size, state (not downloaded, downloading n%, ready, update available, failed), verified date |
| BottomSheet | Filters, Note, SOS confirm; handle plus a close button |

## 5. Screens (v1) — all in the prototype

1. **Home.** Hero "Next ride" (trail, date, access chip, packed progress, pack status, Start ride). Banner for a stale offline pack. Due soon (max 3). Near you (tiles). Latest ride (route art, duration, distance, climb, "View ride story"). Empty state: "Find your first trail" and "Plan a trip".
2. **Trails.** Search, chips (Near me, Open now, Saved, Offline, Filters), trail rows with status chip, map toggle later.
3. **Trail detail.** Route art, name, stats, go/no-go strip, Download for offline (size), Send to Google Maps, Ride this trail. A restricted or unverified trail shows its warning before any download button, and is never labelled open (doc 14 §2.4).
4. **Record, ready.** Readiness list (GPS, battery, offline pack, background recording permission), route row, hydration and check-in settings, a 72 px Start ride. Checklist chip never blocks Start.
5. **Record, live.** Dark, no tab bar, screen on. Distance hero, moving time, speed, map, "on route" cue, Note, Waypoint, Hold to stop, Hold for SOS. No text entry, menus or dialogs while moving; prompts wait until stopped.
6. **Ride story.** The Ather idea: after Stop, a recap with a hero distance card, route, highlights (longest stop, best stretch, waypoints), start and end, Trim, Save, Discard. Replaces a plain stats screen. "Submit as trail draft" is v1.1.
7. **Clubs.** Next club ride with Going and Maybe, your clubs, find a club.
8. **You.** Totals line (personal only), ride log, notes, garage, safety contact, offline packs, settings and privacy, erase everything, emergency-services disclaimer.

Also in v1, not yet drawn: offline packs list, plan trip and checklist editor, safety setup, sign-in and devices, permissions guide per phone brand.

**Home design notes from Ather:** one big thing first; status in a dark banner when action is needed; "View … →" full-width rows to go deeper; horizontal highlight cards with route art. **Not copied:** its colours, imagery, wording, or swipe-only actions. Lifetime-savings style stats are not a fit; the totals line stays inside You.

## 6. Core flows

- **Plan, ride, log:** Trails → trail → Ride this trail (or Home → Next ride) → pack and checklist → Record, readiness passes → Start → ride (audio hydration cue, one-tap Note and Waypoint) → hold Stop → Ride story → trim, name, Save.
- **Find, download, navigate:** search → read access and condition first → Download for offline (size, Wi-Fi hint) → "Ready offline" chip on every list → Ride this trail → Record with the route loaded, "back on route" cues; hand-off to Google Maps for road legs.
- **Join a club ride:** Clubs → ride plan → Going → it becomes Home's next ride → push the day before.

## 7. Tech stack

**Decision: React Native with Expo (dev builds), unchanged from doc 15, with a custom Kotlin recorder.** Flutter ties on UI and maps but shares nothing with `packages/domain`, the Zod schemas, the tokens or the API client. Kotlin Multiplatform and native cost two UI codebases for a small team. Native Kotlin is kept only as the recorder.

| Layer | Pick | Fallback / risk |
|---|---|---|
| Framework | Expo SDK 58, React Native 0.88 (New Architecture only), dev builds | Flutter if sharing TypeScript stops mattering |
| Recording | Small Kotlin foreground service as an Expo module, writing points to SQLite every few seconds, surviving the JS process dying; `expo-location` on iOS | Transistorsoft background-geolocation (about $399 per app, **price unconfirmed**); `expo-location` alone is not trusted for a 4-hour ride |
| Maps | `@maplibre/maplibre-react-native` 11, self-hosted vector tiles on R2 | Whether MapLibre's offline manager accepts PMTiles is **unverified**; fallback is downloading regional MBTiles |
| Local DB | `op-sqlite` (WAL) with our own sync (doc 15 §4.3) | `expo-sqlite`; PowerSync only if Club data grows |
| Auth | Supabase Auth with PKCE (`supabase-js`, secure storage) | Own device tokens for Myto Navi only |
| Styling | Uniwind (Tailwind v4) with a theme generated from `packages/tokens` | Unistyles 3 (NativeWind v5 is still a release candidate) |
| Navigation | Expo Router | |
| Lists | FlashList | |
| Push | `expo-notifications`, FCM and APNs | |
| Delivery | EAS Build, EAS Update for JS-only fixes | Fastlane |
| Testing | Maestro on real devices; Vitest or Jest on shared packages | Detox |

**Platform order (decided by the owner, 25 October 2026):** Android first (doc 15 §13.1), iOS when the recorder is proven.

**Sharing tokens without drift.** Keep CSS in `packages/tokens` as the source; add the dark and ride-mode values; add a build step that emits a `theme.ts` for the app and a `@theme` block for Uniwind; run the existing contrast tests on dark and ride pairs in CI; extend `tooling/check-colors.mjs` to cover `apps/mobile` and `rgb()` or named colours. Move `status-map.ts` to a shared package.

**Spike S0 must prove** (extends doc 15 §12): a 4-hour recording on at least four real phones (Xiaomi or Redmi, Oppo, Vivo, Samsung) with the screen locked and battery saver on, under 1% points lost, comparing the Kotlin service, `expo-location` and a Transistorsoft trial; the Kotlin service and JavaScript sharing one SQLite file safely across a process kill; an offline MapLibre pack from R2 rendering with no network; background voice recording alongside GPS; Metro resolving the shared packages and the generated theme; Supabase PKCE sign-in and refresh through a universal link; one over-the-air update on a release build.

## 8. Changes needed in other documents

- **Doc 15 §1, §3, §4.2:** five tabs become four plus Record (this doc). §4.1 gains SDK 58, New Architecture and the custom recorder.
- **Doc 15 §4.4 contradicts §4.5** (email-link exchange for a device token versus Supabase tokens). Make §4.5 canonical; reduce §4.4 to token storage and app lock.
- **Doc 15 §6:** Android 14 and later needs the `FOREGROUND_SERVICE_LOCATION` permission; Android 12 and later restricts starting a foreground service from the background, so recording must start from a tap in the foreground. Add the Play background-location declaration. Decide PMTiles or MBTiles for offline.
- **Doc 15 §2:** move a minimal safety check-in ("tell my contact if I am not back by X", manual SOS sheet) from Next to the first release; crash detection stays out. Add a pre-ride readiness check and a post-ride save, trim or discard step.
- **Doc 15 §4.5:** Supabase does not put an `email_verified` claim in the token; the custom access-token hook is required.
- **Repo:** `packages/api-client` is cited in the docs but does not exist; it is on the critical path.
- **Docs 08, 09:** record the radii decision and the app's dark palette once agreed.

## 9. Decisions needed

1. ~~Four tabs plus Record~~ **Decided (25 Oct 2026): yes.**
2. ~~Android first~~ **Decided (25 Oct 2026): yes.**
3. Is Club in v1 at the light level in §2?
4. Is the minimal safety check-in in v1?
5. Which radii scale is canonical for the web?
6. Real phones for the spike: which four, and who holds them?
7. The questions in doc 15 §4.5 and §13 about the shop's Supabase project (asymmetric signing keys, who owns it).

## 10. Build order

Per doc 15 §12, with Home as a stub in S1 (saved trails, near you) that gains cards as modules arrive: **S0** spike → **S1** shell, Home stub, Trails, offline pack → **S2** checklists and reminders on Home → **S3** Record, Ride story, notes, waypoints → **S4** Clubs and push → **S5** garage and fuller safety. The Expo app begins after the S0 gate; the prototype is for design review only and will be discarded.
