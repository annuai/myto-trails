# Myto investor pitch: canonical content (10 slides)

The short version of the strategy deck (`deck-content.md`), built from the same layouts, model and assets: `DECK=pitch node build.mjs` (see `npm run pitch:build`). Same format and rules as `deck-content.md`; words and numbers still come only from here and `../model.mjs`.

## 01 | cover
status: Draft for discussion, 13 Nov 2026
kicker: Investor pitch, Nov 2026
headline: Myto
sub: Enjoy the ride. Explore more. Share the journey.
body:
- An India-first motorcycle touring ecosystem: Explore, Ride, Equip, Connect.
caption: Every figure in this deck is a planning assumption, not traction. Myto is on no app store and billing is not live.
img: ending.webp

## 02 | problem
status: Hypothesis
kicker: Problem
headline: A ride is planned in tools that do not know each other.
sub: Trails, group rides and the record of the ride live in different places.
items:
- Access is hard to trust | Trail access sits in posts and pins with no evidence, expiry or moderation.
- Group rides run on chat | Chat groups and payment screenshots, with no roster or capacity.
- Rides leave no record | A good ride vanishes: no journal, no recap, no places reached.
caption: From product docs and one competitor review, not user research. Testing these with riders is the first job of the year.
sources: docs/01, docs/02, docs/competitive
img: safety.webp

## 03 | solution
status: Built+In build
kicker: Solution
headline: Four parts, one rider.
sub: Explore, Ride, Equip, Connect.
items:
- Explore | Built | Trails database, GPX, route planning, offline maps. | maps.webp
- Ride | Built | Record, journal, fuel log, yearly recap. | record.webp
- Equip | Built+In build | Fix-it guides are built. Shop discovery is in build. | adventure-body.webp
- Connect | Built+In build | Clubs and group rides are built. Trailmarks are in build. | group.webp
caption: Status as of 13 Nov 2026. In-build items are not verified and are not shipped.

## 04 | demo
status: Built
kicker: Product
headline: See it in action.
sub: From a trail you can trust to a group ride, in one app.
items:
- Find a trail you can trust | Access, condition and how we know, before you leave.
- Record the ride | Distance, time, SOS and a journal, with offline maps.
- Ride together | Clubs, a live group view and a leader's view.
shot: dash.jpg
caption: Demo video to be added. The poster is a real frame from the Nov 2026 test build, with test data. Myto is on no store.
sources: video/public/capture

## 05 | audience
status: Hypothesis
kicker: Market
headline: Touring and adventure riders who ride out, and ride together.
sub: Three roles, one rider. Participants never pay.
items:
- Riders | Pays: Never | Weekend and multi-day touring and adventure riders in India.
- Organisers | Pays: Above 5 riders | Club road captains and ride leaders. They buy capacity. The buyer.
- Contributors | Reward: Credit, not cash | Riders who add trails, conditions and photos. Credited and moderated. The supply side.
caption: No rider count, market size or willingness to pay has been measured. Measuring them is the first job of the year.
img: group.webp

## 06 | monetisation
status: Hypothesis
kicker: Business model
headline: Organisers and gear buyers pay. Riders never do.
sub: Advertising is deferred. Commerce never touches trust.
items:
- Large Ride Pass | Organiser pays per ride | Implement | 33
- Myto Organiser | Organiser pays monthly | Implement | 34
- Shop: Originals | Margin on own goods | Implement | 32
- Shop: curated | Commission, partner pays | Implement | 33
- Sponsored challenges | Partner pays a fixed fee | Validate | 28
caption: Scores are nine-axis judgement scores (value, fit, revenue, time, effort, cost, platform risk, legal risk, scale), 1 to 5 each. They are not data.
sources: monetisation-model.md §3

## 07 | opportunity
status: Built+Planned
kicker: Traction
headline: No traction yet. Here is what is built.
sub: Myto is on no store and has no users to report. We start measuring at the first release.
items:
- Built | Built | Four approved trails near Bengaluru, with access and condition evidence.
- Built | Built | A working test build: record, journal, offline maps, group rides, clubs, Fix-it.
- Built | Built | Moderation tools for trail access. One competitor reviewed from public pages.
- Next | Planned | A store release and the first real riders.
- Next | Planned | 50 to 100 founding contributors, club road captains first.
- Next | Planned | One honest purchase path for organisers.
caption: Nothing here is traction. Items are product status as of 13 Nov 2026.
sources: apps/web/data/trails; docs/competitive
img: setup.webp

## 08 | competitive
status: Built+Planned
kicker: Competition
headline: Trust in the trail is where we start. Events are where we catch up.
sub: One competitor reviewed. Evidence grade from the 2026-11-01 note.
items:
- Trail access with evidence and moderation | Built | No moderation story found for pins | Their app not opened
- Records and navigates offline | Built | Blog calls offline a "mirage"; mesh not shipped | Blog only
- Live group map with rider status | Built | Yes, their most praised feature | Store, reviews
- Ride events with RSVP and check-in | Built+Planned | Yes | Store. Ours: QR check-in not verified
caption: Based only on the 2026-11-01 note (public pages and store listings; their app not opened). No claim of superiority beyond it. Other competitors not analysed.
sources: docs/competitive

## 09 | partnerships
status: Hypothesis
kicker: Why now
headline: The pieces finally fit on one phone.
sub: Hypotheses from the product docs. Market sources are still to add.
items:
- Touring is a weekend habit | Riders and clubs already organise multi-day rides, mostly on chat groups.
- The phone does the work | GPS, offline maps and background recording, with no extra hardware.
- Trust is the open gap | The one competitor reviewed shows no moderation story behind trail access.
- A working build exists | The product is built and testable, so the first store release is the Foundation phase, Nov to Jan.
caption: These are hypotheses to back with sources and rider interviews. None is a measured market fact.
img: o01-roadside-stop.webp

## 10 | ask
status: Hypothesis
kicker: The raise
headline: Fund a validation year, not a profit year.
sub: Enough to reach a store, prove one paid path and measure real riders.
items:
- Foundation | Nov to Jan: be shippable and honest. | Gate: store track, 50 contributors
- First monetisation | Feb to Apr: one honest purchase path. | Gate: first real store purchase
- Engagement | May to Jul: reasons to return. | Gate: retention measured
- Consolidation | Aug to Oct: decide with evidence. | Gate: year-two plan on real data
raise: {{base.peakDeficit|short}} | Base-case cash need, Nov 2026 to Oct 2027 | Hypothesis
note: Enjoy the ride. Explore more. Share the journey.
img: o03-evening-camp.webp
caption: Peak cumulative loss in the base case. It excludes founder and team pay, so the real raise is higher. No scenario is profitable in year one.
sources: financial-assumptions.md; model.mjs
