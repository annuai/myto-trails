# Myto strategy deck: canonical content

This file is the single source of slide text. `build.mjs` turns it, plus the numbers from `../model.mjs`, into `index.html`. Edit here, then run `npm run deck:build` from the repo root. Do not edit `index.html`.

Format. A slide is a `## NN | layout` heading followed by `key: value` lines. A key with no value takes the `- ` list lines under it. Table-like lists use ` | ` between cells. `{{base.year.revenue|inr}}` pulls a number from model.mjs (scenario, `year` or `last`, field, then a formatter: `inr`, `short`, `num`, `pct`; inputs use `{{in.base.marTarget|num}}`; shared inputs `{{shared.STORE_FEE|pct}}`). Status words are only: Built, In build, Planned, Hypothesis; join with `+` for mixed. The cover's status is the free text "Draft for discussion, date".

Image rule. An `img:` entry is a file stem in `assets/img/` or `assets/pending/` (the build uses the web-sized copy in `assets/opt/`); a `shot:` entry is a file in `assets/shots/`. A missing file fails the build. There are no placeholders: every picture is a real asset, and the two Shop and Trailmarks screens are labelled concept mockups drawn by the deck, not screenshots.

Footers. `caption`, `assumptions` and `sources` are joined into one quiet two-line note, so keep the three together under about 280 characters (the build warns).

## 01 | cover
status: Draft for discussion, 12 Nov 2026
kicker: Strategy and plan, Nov 2026 to Oct 2027
headline: Myto
sub: Enjoy the ride. Explore more. Share the journey.
body:
- An India-first motorcycle touring ecosystem: Explore, Ride, Equip, Connect.
caption: Every figure in this deck is a planning assumption, not traction. Myto is on no app store and billing is not live.
img: ending.webp
notes: Full-bleed illustration right, text left on paper.

## 02 | vision
status: Built+In build
kicker: Vision
headline: Celebrate exploration, not speed.
sub: A lifestyle brand with a useful product, for touring and adventure riders in India.
items:
- Explore | Built | A trusted trails database: may I ride it, and how do we know?
- Ride | Built | Record rides, keep a journal, plan routes, ride together.
- Equip | Built+In build | Fix-it guides are built. Shop discovery is in build.
- Connect | Built+In build | Clubs and group rides are built. Achievements are in build.
caption: Riders contribute trails, conditions and photos. It is not a social network: no follows, likes or rankings.
sources: PRODUCT.md; docs/15
img: rider-on-ridge.webp

## 03 | problem
status: Hypothesis
kicker: Problem
headline: The journey is scattered across tools that do not know each other.
sub: Trail access, rides, group coordination and gear live in different places.
items:
- Access is hard to trust | Trail access sits in posts and pins with no evidence, expiry or moderation.
- Group rides run on chat | Chat groups and payment screenshots, with no roster or capacity.
- Rides leave no record | A good ride vanishes: no journal, no recap, no places reached.
- Gear is detached from the trip | What to carry, how to fix it and where to buy it are separate searches.
caption: These statements come from product docs and one competitor review. They are not user research; testing them with riders is a Foundation task.
sources: docs/01, docs/02, docs/competitive
img: safety.webp

## 04 | audience
status: Hypothesis
kicker: Audience
headline: Touring and adventure riders who ride out, and ride together.
sub: Three roles, one rider. Participants never pay.
items:
- Riders | Pays: Never | Weekend and multi-day touring and adventure riders in India.
- Organisers | Pays: Above 5 riders | Club road captains and ride leaders. They buy capacity. The buyer.
- Contributors | Reward: Credit, not cash | Riders who add trails, conditions and photos. Credited and moderated. The supply side.
caption: No rider count, market size or willingness to pay has been measured. Measuring them is the first job of the year.
img: group.webp

## 05 | opportunity
status: Hypothesis
kicker: Opportunity
headline: What we know, and what we still have to measure.
sub: We do not put a market size on this slide because we have not measured one.
items:
- In hand | Built | Four approved trails near Bengaluru, a working test build, group rides, clubs, Fix-it.
- In hand | Built | One competitor reviewed from public pages (2026-11-01).
- To measure | Planned | Touring riders reachable in the launch radius, and how many ride monthly.
- To measure | Planned | Organisers who would pay for capacity, and at what price.
- To measure | Planned | Contributors who stay after the first trail.
caption: The financial scenarios assume monthly active riders; they are not traction.
sources: apps/web/data/trails; docs/competitive
img: setup.webp

## 06 | solution
status: Built+In build
kicker: Solution
headline: Four parts, one rider.
sub: Explore, Ride, Equip, Connect.
items:
- Explore | Built | Trails database, GPX, route planning, offline maps. | maps.webp
- Ride | Built | Record, journal, fuel log, yearly recap, Marks on the device. | record.webp
- Equip | Built+In build | Fix-it guides are built. The Shop discovery layer is in build. | adventure-body.webp
- Connect | Built+In build | Clubs and group rides are built. Trailmarks and challenges are in build. | group.webp
caption: Status as of 12 Nov 2026. In-build items are not verified and are not shipped.

## 07 | product
status: Built
kicker: Product
headline: What exists today.
sub: Real captures from the test build.
items:
- dash.jpg | Dash: the next ride and a trail to navigate to
- trail-detail.jpg | Trail: can I ride it, with access, condition and how we know
- recording.jpg | Record: distance, time, SOS, report, group
- group-ride.jpg | Group ride: quick signals and the leader's view
caption: Real captures from the Nov 2026 test build, with test data. Myto is on no store. The Shop and Trailmarks screens are not shown here: they are not yet verified in the app.
sources: video/public/capture

## 08 | flywheel
status: In build+Planned
kicker: Contribution engine
headline: Riders make the directory trustworthy.
sub: Evidence and moderation come before reach.
items:
- 1 | Ride | Riders record rides in real conditions. | Built
- 2 | Contribute | A trail, report or photo, credited. | In build
- 3 | Moderate | Evidence, expiry and review come first. | Built
- 4 | Trust | Access and condition, with how we know. | Built
- 5 | More riders | A trusted directory brings riders back. | Hypothesis
stats:
- 50 to 100 | founding contributors targeted | Planned
- 30+ | approved trails in the launch radius, an assumption | Planned
caption: Contribution mapping to moderation is in build and not verified. Moderation tools exist (docs/11); the app-to-moderation flow is still to confirm.
sources: docs/11, strategy.md §6.2
img: e01-contribution-evidence.webp

## 09 | engagement
status: In build
kicker: Engagement
headline: Reward reaching places, never speed.
sub: Trailmarks and challenges are in build, not verified.
items:
- Trailmarks | A place reached is the reward, not a time.
- Challenges | Time-boxed and exploration-based. No speed.
- Optional board | Ranks contributions only, never speed.
- Credit for contributors | Marks and credit, not cash per item.
note: Not money. | A thank-you for helping the map. Trailmarks can't be bought, sold or cashed out.
concept: marks
img: e02-trailmark-viewpoint.webp
caption: Concept mockup drawn from the code in build, not a screenshot. Marks on the device are built; Trailmarks, badges and challenges are written and unit-tested but not yet run end to end in the app.
sources: docs/15; docs/todo.md

## 10 | shop
status: In build
kicker: Equip: the Shop
headline: A Shop for the ride, kept outside the app.
sub: Physical goods only, bought on myto-moto.com.
items:
- Myto Originals | Our own products. Myto earns the margin.
- Curated third party | Chosen on stated criteria. Myto earns a commission.
- Always labelled | Original, Partner or Affiliate, in words.
- Discovery layer | In build: gear in context, a link out, no in-app payment.
stats:
- {{base.year.shopGMV|inr}} | Shop GMV, base case, year one (customer-paid) | Hypothesis
- {{base.year.shopRev|inr}} | Myto's take: Originals ex-GST plus commission | Hypothesis
concept: shop
img: e03-touring-kit-flatlay.webp
caption: GMV is not Myto's income. Physical goods sit outside in-app purchase (Apple 3.1.3(e), Google Payments policy). Concept screen; the flat lay is illustrative.
assumptions: Base: {{in.base.shopCtr|pct}} of active riders open the link, {{in.base.shopConv|pct}} order, average order {{in.base.aov|inr}}, Originals {{in.base.originalsShare|pct}} of orders at {{in.base.originalsGM|pct}} margin, commission {{in.base.curatedCommission|pct}}.

## 11 | group
status: Built+Planned
kicker: Group rides
headline: Free up to 5. Organisers pay for more. Participants never pay.
sub: Capacity is configuration, not code.
items:
- Free | 5 | Participants incl. organiser | Built
- Large Ride Pass | 20 | About ₹99 a ride, hypothesis | Planned
- Myto Organiser | 50 | ₹249 to 299 a month, hypothesis | Planned
stats:
- Built | Capacity limit, entitlements, upgrade prompt, unit-tested | Built
- Not live | Billing: no store release or paid Apple account yet | Planned
- 100 today | The free cap stays 100 until a purchase path exists | Built
caption: Capacity is configuration, not code. Limits and prices can change. A larger ride must be bought through store billing on iOS and Android (monetisation-model §4).
shot: group-ride.jpg
img: o02-large-group-road.webp

## 12 | monetisation
status: Hypothesis
kicker: Monetisation architecture
headline: Seven streams. Three to build, two to test, one to wait on.
sub: Organisers and gear buyers first. Advertising last.
items:
- Large Ride Pass | Organiser pays per ride | Implement | 33
- Myto Organiser | Organiser pays monthly | Implement | 34
- Shop: Originals | Margin on own goods | Implement | 32
- Shop: curated | Commission, partner pays | Implement | 33
- Sponsored challenges | Partner pays a fixed fee | Validate | 28
- Event ticketing take | Percentage of ticketed rides | Validate | 25
- Advertising | Labelled placements | Defer | 22
caption: Scores are nine-axis judgement scores (value, fit, revenue, time, effort, cost, platform risk, legal risk, scale), 1 to 5 each. They are not data.
sources: monetisation-model.md §3

## 13 | partnerships
status: Hypothesis
kicker: Advertising and partnerships
headline: Commerce never touches trust.
sub: Advertising is deferred. These rules are fixed now.
items:
- Always labelled | Sponsored, Partner, Affiliate or Original, in words.
- Never influences safety | Not conditions, access status, search order or moderation.
- Never sells location | No location, ride or contact data. Aggregate counts only.
- No ads in safety flows | Not in Help, SOS, check-in, live group view or recording.
- No advertising identifiers | No cross-app tracking.
- Curated means chosen | By Myto, on stated criteria, not by bid.
caption: No partner is contracted. The sponsored challenge pilot is a hypothesis for Phase 3.
sources: monetisation-model.md §5; docs/15
img: o01-roadside-stop.webp

## 14 | gtm
status: Planned
kicker: Go to market
headline: Start where the verified trails are.
sub: Bengaluru and the weekend-ride radius, then only if it works.
items:
- Region | Four approved trails, all in or beside Bengaluru. Other states: coming soon.
- Founding cohort | 50 to 100 contributors by invitation, club road captains first.
- Content | Trail of the month, ride reports with GPX, short Fix-it guides, yearly recap cards.
- Partners | Clubs, curated gear brands, route homestays and mechanics. None contracted.
trails:
- Hesaraghatta Wetlands | Bengaluru Urban | 2 km
- Manchanabele Dam | Bengaluru South | 37 km
- Bettahalasuru Lake | Bengaluru Urban | 1 km
- Thippagondanahalli Reservoir | Bengaluru Urban | 0.5 km
caption: Evidence is where the team has worked, not measured demand. Live trail and club counts were not queried for this deck.
sources: apps/web/data/trails; strategy.md §6
img: trails.webp

## 15 | roadmap
status: Planned
kicker: Roadmap
headline: Four phases. One gate each.
sub: Nov 2026 to Oct 2027. Each phase waits for its gate.
phases:
- Foundation | Nov to Jan | Be shippable and honest | On a store track, in-build work verified, 50 founding contributors
- First monetisation | Feb to Apr | One honest purchase path for organisers | First real store purchase, free cap switched to 5
- Engagement | May to Jul | Reasons to return | Two-month retention measured, one labelled sponsored pilot
- Consolidation | Aug to Oct | Decide with evidence | Year-two plan from measured inputs
items:
- 1 | Store accounts and readiness | P0 | Planned
- 1 | Verify in-build work | P0 | In build
- 1 | Founding contributors, coverage | P0 | Planned
- 2 | Purchase path, Pass and Organiser | P0 | Planned
- 2 | Switch free cap to 5 | P0 | Built
- 2 | Shop link in app | P1 | In build
- 3 | Trailmarks, challenges, contributors | P1 | In build
- 3 | Club ride events, QR check-in | P1 | Planned
- 3 | Sponsored challenge pilot | P2 | Hypothesis
- 4 | Re-run the model on measured data | P0 | Planned
- 4 | Trust audit, sync, garage decision | P0 | Planned
- 4 | Prune, second-region decision | P1 | Hypothesis
caption: Full table with objective, user problem, deliverables, dependencies, effort and metrics: product-roadmap.md.

## 16 | financials
status: Hypothesis
kicker: Financial scenarios
headline: A validation year, not a profit year.
sub: Three scenarios of planning assumptions. GMV, revenue, profit and net are kept apart.
stats:
- {{conservative.year.gmv|short}} / {{base.year.gmv|short}} / {{ambitious.year.gmv|short}} | GMV, year one: Customer-paid, not income | Hypothesis
- {{conservative.year.revenue|short}} / {{base.year.revenue|short}} / {{ambitious.year.revenue|short}} | Revenue: Myto's own, ex-GST | Hypothesis
- {{conservative.year.grossProfit|short}} / {{base.year.grossProfit|short}} / {{ambitious.year.grossProfit|short}} | Gross profit: After fees and cost | Hypothesis
- {{conservative.year.contribution|short}} / {{base.year.contribution|short}} / {{ambitious.year.contribution|short}} | Contribution: After gateway, returns | Hypothesis
- {{conservative.year.opex|short}} / {{base.year.opex|short}} / {{ambitious.year.opex|short}} | Opex: Fixed, before founder pay | Hypothesis
- {{conservative.year.net|short}} / {{base.year.net|short}} / {{ambitious.year.net|short}} | Net, year one: No scenario profitable | Hypothesis
- {{in.conservative.marTarget|num}} / {{in.base.marTarget|num}} / {{in.ambitious.marTarget|num}} | Active riders, Oct 2027: Assumed | Hypothesis
- {{conservative.breakEvenMar|num}} / {{base.breakEvenMar|num}} / {{ambitious.breakEvenMar|num}} | Break-even riders: Product-only, Oct mix | Hypothesis
caption: No scenario is profitable in year one. Base revenue includes {{base.year.partnerRev|short}} of sponsored challenges, a hypothesis.
assumptions: L = lakh (₹1,00,000). Store fee {{shared.STORE_FEE|pct}}, GST {{shared.GST_RATE|pct}} (verify), pass {{shared.LARGE_PASS_PRICE|inr}}, organiser {{shared.ORGANISER_PRICE|inr}} a month.
sources: financial-assumptions.md; store fee pages, 2026-11-12

## 17 | competitive
status: Built+Planned
kicker: Competitive positioning
headline: Trust in the trail is where we start. Events are where we catch up.
sub: One competitor reviewed. Evidence grade from the 2026-11-01 note.
items:
- Trail access with evidence and moderation | Built | No moderation story found for pins | Their app not opened
- Records and navigates offline | Built | Blog calls offline a "mirage"; mesh not shipped | Blog only
- Live group map with rider status | Built | Yes, their most praised feature | Store, reviews
- Ride events with RSVP and check-in | Built+Planned | Yes | Store. Ours: QR check-in not verified
- Split expenses on a ride | Planned | New in their Oct 2026 update | Store. Ours: not built
- Paid rides | Planned | Off-app via UPI QR | Policy. Ours: not built
caption: Based only on the 2026-11-01 note (public pages and store listings; their app not opened). No claim of superiority beyond it. Other competitors not analysed.
sources: docs/competitive

## 18 | vision-long
status: Hypothesis
kicker: Long-term vision
headline: Enjoy the ride. Explore more. Share the journey.
sub: A rider's year, on the road and on the page.
items:
- Year one | Prove trust and one honest paid path for organisers. Learn what they will pay for.
- Year two | Decide on sync and garage. Open a second region only if contributions show it.
- Beyond | Devices such as Myto Navi stay a stated companion idea (PRODUCT.md), not a commitment.
caption: Directions, not commitments. Nothing beyond Phase 4 is planned in detail.
img: o03-evening-camp.webp
