# Riding Verse: what they offer, and how we beat it

Date: 2026-11-01 · Sources: ridingverse.com (all 5 pages, sitemap, ~190 blog posts, 28 read in full), App Store and Google Play listings, privacy policy, terms.

**Limit of this research.** I could not open the app itself (it needs a phone number sign-in). Everything below comes from their website, store listings, reviews and their own policies. Where a claim comes only from a blog post, I say so.

## 1. What Riding Verse is

An Indian motorcycle community app by Explorations and Innovations Technologies (Gurugram). iOS and Android, free. About 10K+ Android downloads, 4.3 stars on both stores (40 iOS ratings, 64 Play reviews). The website is marketing only: a single landing page, a blog, contact, privacy and terms. There is no web product. The blog (~190 posts) is SEO content; roughly 30 posts describe the app, the rest are riding guides.

Tagline: "Plan. Ride. Connect." Pitch: replace the maps app + WhatsApp group + safety tracker with one app. Their strongest proof is group rides: a review credits it for an 85+ rider ride.

## 2. Feature inventory

Evidence grade: **Store** = in the App Store/Play listing (real, shipped). **Blog** = only in a blog post (may be aspirational). **Policy** = implied by privacy/terms.

### Ride and group
| Feature | Evidence | Notes |
|---|---|---|
| Group ride planning: route by distance/terrain/stops, share via one link, start now or schedule | Store | |
| Live map with every rider in a group | Store, reviews | Their most praised feature |
| Turn-by-turn navigation | Store | Recent: car routes, re-routing |
| Fuel stops along the route | Store (latest update) | |
| Split expenses for ride costs | Store (latest update) | New, in Oct 2026 update |
| Ride filters, "explore rides around you", open community rides | Store | |
| Ride roles with colour badges on the live map: Captain, Head Marshal, Medic, Tail Sweep, Rider | Blog | |
| Proximity alert when the pack stretches too far | Blog | |
| QR check-in at the start, paid-ride dashboard (registrations, revenue) | Blog | Payments happen off-app by UPI/QR (policy) |
| In-app ride chat, live status | Store | Review asks for "decline an invite with a polite message to the admin" |
| Shareable ride cards | Store | |
| "Mesh" that works with no signal, voice intercom, "digital wave" between passing riders, skill-matched joining | Blog only | Written in the style of concept art; treat as not real |

### Safety
| Feature | Evidence |
|---|---|
| Ride Safe: crash detection, countdown to cancel, then SOS with live location to emergency contacts | Store |
| Three sensitivity modes (high for highway, medium mixed, low for off-road) | Blog |
| Live location sharing with "guardians" | Blog, reviews |
| Community hazard alerts: accidents, roadblocks, bad roads | Store |
| Live fuel/ATM/network status pins from riders, verified offline GPX | Blog only |

### Community
| Feature | Evidence |
|---|---|
| Clubs: create, public/private, verified badge, join by link/phone/QR/proximity, admin roles, announcements | Store, Policy |
| Events: host public or private, RSVP, third-party partner events (e.g. SSR Synergy Splash Ride 2026) | Store, Blog |
| Rider profile, badges and milestones, follow riders, posts | Store |
| Leaderboards, likes on rides, mentorship, marketplace for gear | Blog only (marketplace and "100,000 riders" claims contradict the 10K downloads) |

### Personal
| Feature | Evidence |
|---|---|
| Ride tracking: max/avg speed, speed-time graph, distance, duration, history | Blog |
| Garage showcase: bike photos, specs, mods | Blog, Store |
| Maintenance log, document vault (RC, insurance, PUC) | Blog |
| Trip journal with located photos and notes | Blog |
| Verified stays with secure parking, mechanic directory | Blog only |

## 3. Where they are weak (our openings)

1. **Phone-number accounts and "location even when not open".** Heavy permissions, no encryption (Play data safety says data isn't encrypted). We are private by default and local-first.
2. **Everything is server-first.** Their blog admits offline is a "mirage" for static maps and then claims a mesh it does not ship. Ours records and navigates with no network.
3. **Access and condition trust.** They crowdsource pins with no moderation story. Our directory has evidence, expiry and moderation. This is our moat; they have nothing like it.
4. **Payments and rosters are off-app.** Paid rides are a dashboard over UPI QR codes the organiser pastes in. No receipts, no refunds, no reconciliation.
5. **Feature sprawl.** Their store copy lists eight pillars with equal weight. One review thread shows rough edges (no polite decline, crashes fixed in 1.3.7).
6. **No web product.** Shared ride links have no rich web page (to verify in app). We already have public trail, route and track pages.

## 4. Gap matrix against what we have

Based on our docs and a code search; items marked "verify" need a closer look before we commit.

| Capability | Us today | Gap |
|---|---|---|
| Trail directory with access/condition trust | Strong, web + mobile | None. Ahead of them. |
| Record a ride, journal, recap, ride card | Yes | None |
| Group ride with live map, leader, regroup, signals, rider colours | Yes | Roles (Captain/Sweep/Medic) as named roles; stretch alert (verify) |
| Crash detection, check-in, SOS, emergency card | Yes (detection is beta) | Sensitivity presets (verify) |
| Fuel stops, weather, route plan, GPX import, offline packs | Yes | Turn-by-turn is a stated non-goal |
| Clubs | Yes | Club rides, rosters, announcements (Phase 6 in our plan) |
| Garage, documents, service | Yes (local, no sync) | Sync and one linked bike (Phase 5, not built) |
| Condition reports on trails | Yes | Not a live "hazard pin for riders nearby" feed |
| Ride events: RSVP, QR check-in, paid dashboard | No | **Gap** |
| Split expenses | No | **Gap** |
| Ride chat | Non-goal | Replace with presets, see below |
| Badges, follow riders, leaderboard | No (verify "badge" use) | Gap, low priority |
| Stays and mechanics directory | No | Gap, needs data we do not have |

## 5. Proposed additions, with a better experience

Principles carried over from our rules: free tier only, local-first, private by default, nothing to type while moving, connect before build.

### A. Ride events with RSVP and QR check-in (biggest gap, fits clubs)
- **Object.** A planned ride that a club publishes becomes an event: date, meeting point, route, capacity, roles.
- **Better than them.** One link opens a web page that works without installing the app; RSVP takes two taps; the organiser sees a live roster on their phone. Check-in is a QR scan at the start, and the same scan adds the rider to the group live map. No separate "join" step.
- **Server.** Two tables (`ride_event`, `ride_event_rsvp`) next to `group_ride`. Reuses the ride contract and `/join/[code]` links.
- **Payments.** Out of scope for now: store a note ("pay organiser by UPI") and a manual "paid" tick for the organiser. Real payments cost fees and compliance.

### B. Split expenses on a ride or trip
- **Better than them.** Added at a fuel stop with one tap ("I paid ₹450"), settled at the end with a plain "who owes who" list that can be shared as text or a card. Works offline, syncs into the trip.
- **Server.** None needed in v1: stored in the trip, shared through the existing ride card/link.

### C. Quick signals instead of chat
- Chat while riding is the opposite of "nothing to type while moving". Instead: preset one-tap messages (fuel stop, wait for me, slow down, need help) which we already started with quick signals, plus a polite **"can't make it" reply on an invite** (the exact thing their reviewer asked for).

### D. Rider roles and stretch alert
- Named roles (Captain, Marshal, Medic, Sweep) layered on the rider colours we already ship. Alert the leader when the last rider falls more than N km behind, using positions the group map already has. No server change.

### E. Crash detection presets
- Three sensitivities (Road, Mixed, Off-road) chosen once per bike in the garage, so the choice follows the bike rather than needing a setting before each ride.

### F. Live hazard pins (only if we can keep them trustworthy)
- Extend condition reports so a rider can drop a pin with one tap while riding (voice or large button), shown on the live map for riders nearby, expiring in hours, and confirmed or dismissed by others. Their version has no expiry or moderation; ours can borrow the access-expiry model. Needs rate limits and abuse controls, so it is a later phase.

### G. Things we should not copy
- Mesh networking, voice intercom, digital wave, AI "predictive navigation", marketplace, leaderboards, mentorship: either not real, unmaintainable on the free tier, or off our product focus.
- Turn-by-turn: stays a non-goal unless you reverse it. If you do, the cheapest route is handing off to the phone's maps app, not building our own.

## 6. Suggested order

1. **Events + RSVP + QR check-in** (A) and **invite decline** (C).
2. **Roles + stretch alert** (D) and **crash presets** (E): small, no server.
3. **Split expenses** (B).
4. **Sync, one bike, club rides** from our existing Phase 5 and 6, which these depend on.
5. **Live hazard pins** (F) after moderation tooling.

## 7. Decisions needed from the owner

1. Do events come first, or finish Phase 5 sync first? Events do not need sync but benefit from it.
2. Reverse the "no turn-by-turn" non-goal, hand off to another maps app, or keep it out?
3. Are paid rides in scope at all? My default is no: manual paid tick only.
4. Is a social layer (follow, likes, badges, leaderboard) wanted, or do we stay trust-and-ride focused?
5. Should we spend time on stays and mechanics directories? They need data we would have to collect.

## 8. Wider landscape (2026-11-13)

Public listings and press only; no app opened, no usage data. Feeds deck slide 17.

| App | What the listing shows | Source |
|---|---|---|
| The Good Biker (TGB Technologies) | Ride tracking, live group rides, clubs, events with ticketing, garage and documents, feed, marketplace, AI assistant beta, SOS. Free; about 500+ Android installs; too few iOS ratings to show | [App Store](https://apps.apple.com/us/app/the-good-biker/id6448780305), [Play](https://apkcombo.com/the-good-biker/com.thegoodbiker.userapp) |
| WingManX | Groups, live tracking, rider ratings and verification, tow assist (two a year), insurance and PUC reminders. 4.2 from 25 ratings | [App Store](https://apps.apple.com/in/app/wingmanx/id6479581088) |
| Rev Your Soul (Kiara Motorsports) | Offline maps, documents, group chat, gear shop; one review says payment is not disclosed until after sign-up | [App Store](https://apps.apple.com/in/app/rev-your-soul/id1484967500) |
| REVER | Tracking, route sharing, turn-by-turn; Pro about $40 a year (one source says maintenance-only, unverified) | [App Store](https://apps.apple.com/app/id975571447) |
| Calimoto, Kurviger | Twisty routing and turn-by-turn; offline use is a paid tier (Calimoto about $80 a year, Kurviger price not found) | [Calimoto](https://calimoto.com/en/pricing), [Kurviger](https://docs.kurviger.com/app/manual/pro) |

Not found or not checked: Asteride, Motobit, RideSense, Recky, Trails of India (named in search results, listings not read). Where we lead is our own stated design (trail evidence and moderation, offline first); where they lead is what their listing shows and ours does not.
