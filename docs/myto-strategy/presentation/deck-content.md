# Myto strategy deck: canonical content

This file is the single source of slide text. `build.mjs` turns it, plus the numbers from `../model.mjs`, into `index.html`. Edit here, then run `npm run deck:build` from the repo root. Do not edit `index.html`.

Format. A slide is a `## NN | layout` heading followed by `key: value` lines. A key with no value takes the `- ` list lines under it. Table-like lists use ` | ` between cells. `{{base.year.revenue|inr}}` pulls a number from model.mjs (scenario, `year` or `last`, field, then a formatter: `inr`, `short`, `num`, `pct`; inputs use `{{in.base.marTarget|num}}`; shared inputs `{{shared.STORE_FEE|pct}}`). Status words are only: Built, In build, Planned, Hypothesis; `Preview` marks the draft state. Join with `+` for mixed.

Image rule. An `img:` entry is a file in `assets/img/`; a `shot:` entry is a file in `assets/shots/`; a `pending:` entry is an asset ID from the registry below and shows a visible "IMAGE PENDING <id>" frame until its file exists in `assets/pending/` or `assets/img/`, when the build uses the file.

## pending-registry
- IMG-E01 | e01-contribution-evidence.webp | Rider photographing a trail crossing (Essential) | 3:2
- IMG-E02 | e02-trailmark-viewpoint.webp | Cairn and viewpoint, a place reached (Essential) | 3:2
- IMG-E03 | e03-touring-kit-flatlay.webp | Unbranded touring kit flat lay for the Shop (Essential) | 4:3
- IMG-O01 | o01-roadside-stop.webp | Riders at a roadside tea stop (Optional) | 3:2
- IMG-O02 | o02-large-group-road.webp | Long line of riders on a hill road (Optional) | 16:9
- SHOT-01 | shot-shop-discovery.jpg | Shop discovery screen of the verified build (screenshot) | 1:2
- SHOT-02 | shot-trailmarks.jpg | Trailmarks and challenges screen of the verified build (screenshot) | 1:2

## 01 | cover
status: Preview
kicker: Strategy and plan, Nov 2026 to Oct 2027
headline: Myto
sub: Enjoy the ride. Explore more. Share the journey.
body:
- An India-first motorcycle touring ecosystem: Explore, Ride, Equip, Connect.
caption: Preview draft, 2026-11-12. Images are pending where marked. Every figure is a planning assumption, not traction. Myto is on no app store and billing is not live.
img: ending.webp
notes: Full-bleed illustration right, text left on paper.

## 02 | vision
status: Built+In build
kicker: Vision
headline: Celebrate exploration, not speed.
sub: A lifestyle brand with a useful product, for touring and adventure riders in India.
items:
- Explore | Built | A trusted trails database: may I ride it, can I ride it now, how do we know.
- Ride | Built | Record rides, keep a journal, plan routes, ride together.
- Equip | Built+In build | Fix-it guides are built. The Shop discovery layer is in build.
- Connect | Built+In build | Clubs and group rides are built. Achievements and contribution tooling are in build.
caption: Riders contribute trails, conditions and photos. It is not a social network: no follows, likes or rankings.
sources: PRODUCT.md; docs/15 "deliberately not in the first release"
img: rider-on-ridge.webp

## 03 | problem
status: Hypothesis
kicker: Problem
headline: The journey is scattered across tools that do not know each other.
sub: Trail access, rides, group coordination and gear live in different places.
items:
- Access is hard to trust | Trail access and condition sit in posts and pins with no evidence, expiry or moderation story.
- Group rides run on chat | Club rides are coordinated in chat groups and payment screenshots, with no roster or capacity.
- Rides leave no record | A good ride vanishes: no journal, no recap, no memory of places reached.
- Gear is detached from the trip | What to carry, how to fix it and where to buy it are separate searches.
caption: These statements come from product docs and one competitor review. They are not user research. Testing them with riders is a Foundation task.
sources: docs/01, docs/02, docs/competitive/2026-11-01-ridingverse-analysis.md §3
img: safety.webp

## 04 | audience
status: Hypothesis
kicker: Audience
headline: Touring and adventure riders who ride out, and ride together.
sub: Three roles, one rider. Participants never pay.
items:
- Riders | Weekend and multi-day touring and adventure riders in India. Free: explore, record, fix, join any group ride.
- Organisers | Club road captains and ride leaders. They pay for capacity above 5 riders. The buyer.
- Contributors | Riders who add trails, conditions and photos. Credited, moderated, never paid per item. The supply side.
caption: No rider count, market size or willingness to pay has been measured. Measuring them is the first job of the year.
img: group.webp

## 05 | opportunity
status: Hypothesis
kicker: Opportunity
headline: What we know, and what we still have to measure.
sub: We do not put a market size on this slide because we have not measured one.
items:
- In hand | Built | Four approved trails near Bengaluru, a working test build, group rides, clubs, Fix-it.
- In hand | Built | One competitor reviewed from public pages (2026-11-01); gaps and openings listed.
- To measure | Planned | Touring riders reachable in the launch radius, and how many are active monthly.
- To measure | Planned | Share of organisers who would pay for capacity, and at what price.
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
- Ride | Built | Record, journal, fuel log, Year-in-rides recap, Marks (on device). | record.webp
- Equip | Built+In build | Fix-it guides (built). Shop discovery layer (in build), physical goods only, external. | adventure-body.webp
- Connect | Built+In build | Clubs and group rides (built). Achievements, Trailmarks, challenges (in build). | group.webp
caption: Status as of 2026-11-12. In-build items are not verified and are not shipped.

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
caption: Captured from the screen recordings in video/public/capture (Nov 2026 test build, test data, on no store). Shop and Trailmarks screens: screenshot pending until verified.
sources: video/public/capture/*.mp4
pending: SHOT-01
pending: SHOT-02

## 08 | flywheel
status: In build+Planned
kicker: Contribution engine
headline: Riders make the directory trustworthy.
sub: Evidence and moderation come before reach.
items:
- 1 | Ride | Riders record rides and meet real conditions. | Built
- 2 | Contribute | A trail, a condition report, a photo, credited to the rider. | In build
- 3 | Moderate | Evidence, expiry and review before anything is public. | Built
- 4 | Trust | Access, condition and verification shown with how we know. | Built
- 5 | More riders | A trusted directory brings riders back and brings new ones. | Hypothesis
stats:
- 50 to 100 | founding contributors targeted | Planned
- 30+ | approved trails in the launch radius, an assumption | Planned
caption: Contribution mapping to moderation is in build and not verified. Moderation tools exist per docs/11; app-to-moderation flow still to confirm.
sources: docs/11, docs/02, strategy.md §6.2
pending: IMG-E01

## 09 | engagement
status: In build
kicker: Engagement
headline: Reward reaching places, never speed.
sub: Trailmarks and challenges are in build, not verified.
items:
- Trailmarks | The unit of reward is a place reached, not a time.
- Challenges | Time-boxed, exploration-based, no speed or risk element.
- No speed rankings | An optional, opt-in board ranks verified contributions and discoveries only. Never speed, time or distance.
- Credit for contributors | Recognition and Marks, not cash per item.
caption: Marks on the device are built. Trailmarks, challenges and achievements are in build: the code is written and unit-tested but not yet run end to end in the app.
sources: docs/15 §deliberately not in the first release; docs/todo.md
pending: IMG-E02
pending: SHOT-02

## 10 | shop
status: In build
kicker: Equip: the Shop
headline: A Shop for the ride, kept outside the app.
sub: Physical goods only, at shop.myto-moto.com. Myto Originals and curated third party.
items:
- Physical goods only | No digital unlock is ever sold in the Shop.
- Myto Originals | Our own products. Myto earns the margin.
- Curated third party | Chosen on stated criteria. Myto earns a commission, not the sale.
- Always labelled | Original, Partner or Affiliate, in text.
- Discovery layer | In build: shows relevant gear in context, links out, no in-app payment.
stats:
- {{base.year.shopGMV|inr}} | Shop GMV, base scenario, year one (customer-paid, incl. GST) | Hypothesis
- {{base.year.shopRev|inr}} | Myto's own take on it (Originals sales ex-GST plus commission) | Hypothesis
caption: GMV is not Myto's income. Figures are assumptions. Store policy: physical goods are outside in-app purchase (Apple 3.1.3(e); Google Payments policy). The flat lay is illustrative, not a product.
assumptions: Base: {{in.base.shopCtr|pct}} of active riders open the link, {{in.base.shopConv|pct}} of them order, average order {{in.base.aov|inr}}, Originals {{in.base.originalsShare|pct}} of orders at {{in.base.originalsGM|pct}} gross margin, curated commission {{in.base.curatedCommission|pct}}.
sources: monetisation-model.md §4
pending: IMG-E03
pending: SHOT-01

## 11 | group
status: Built+Planned
kicker: Group rides
headline: Free up to 5. Organisers pay for more. Participants never pay.
sub: Capacity is configuration, not code.
items:
- Free | 5 | Participants incl. the organiser | Built
- Large Ride Pass | 20 | About ₹99 per ride (hypothesis) | Planned
- Myto Organiser | 50 | ₹249 to 299 per month (hypothesis) | Planned
stats:
- Built | capacity enforcement, entitlement table, organiser upgrade prompt, unit-tested | Built
- Not live | billing: no store release, no paid Apple account | Planned
- 100 today | the free cap stays 100 until a purchase path exists; switching to 5 is a config change | Built
caption: Limits and prices are all configurable. Purchases of a larger ride must use the store's billing on iOS and Android (monetisation-model §4).
shot: group-ride.jpg
pending: IMG-O02

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
caption: Scores are nine-axis judgement scores (value, fit, revenue, time, effort, cost, platform risk, legal risk, scale), 1 to 5 each, not data. Free: Explore, Ride, Fix-it, clubs, group rides to 5, joining any ride.
sources: monetisation-model.md §3

## 13 | partnerships
status: Hypothesis
kicker: Advertising and partnerships
headline: Commerce never touches trust.
sub: Advertising is deferred. These rules are fixed now.
items:
- Always labelled | Sponsored, Partner, Affiliate or Original, in words, in every placement.
- Never influences safety | Not conditions, verification, access status, search order or moderation.
- Never sells location | No location, ride or contact data, ever. Only aggregate counts.
- No ads in safety flows | Not in Help, SOS, check-in, live group view or recording.
- No advertising identifiers | No cross-app tracking (docs/15).
- Curated means chosen | By Myto, on stated criteria, not by the highest bidder.
caption: No partner is contracted. Sponsored challenge pilot is a hypothesis for Phase 3.
sources: monetisation-model.md §5; docs/15
pending: IMG-O01

## 14 | gtm
status: Planned
kicker: Go to market
headline: Start where the verified trails are.
sub: Bengaluru and the weekend-ride radius, then only if it works.
items:
- Region | Four approved trails, all in or beside Bengaluru. Test rides and captures are local. Other states: coming soon.
- Founding cohort | 50 to 100 contributors by personal invitation, with club road captains first.
- Content | Trail of the month, ride reports with GPX, Fix-it short guides, Year-in-rides cards.
- Partners | Clubs, curated gear brands, route homestays and mechanics. None contracted.
trails:
- Hesaraghatta Wetlands | Bengaluru Urban | 2 km
- Manchanabele Dam | Bengaluru South | 37 km
- Bettahalasuru Lake | Bengaluru Urban | 1 km
- Thippagondanahalli Reservoir | Bengaluru Urban | 0.5 km
caption: Evidence is where the team has worked, not measured demand. Live trail and club counts were not queried for this deck.
sources: apps/web/data/trails; strategy.md §6
img: group.webp

## 15 | roadmap
status: Planned
kicker: Roadmap
headline: Four phases. One gate each.
sub: Nov 2026 to Oct 2027. Each phase waits for its gate.
phases:
- Foundation | Nov to Jan | Be shippable and honest | Gate: on a store track, in-build work verified, 50 founding contributors
- First monetisation | Feb to Apr | One honest purchase path for organisers | Gate: first real store purchase, free cap switched to 5
- Engagement | May to Jul | Reasons to return | Gate: two-month retention measured, one labelled sponsored pilot
- Consolidation | Aug to Oct | Decide with evidence | Gate: year-two plan from measured inputs
items:
- 1 | Store accounts and readiness | P0 | Planned
- 1 | Verify in-build work (Shop, Trailmarks, contributions) | P0 | In build
- 1 | Founding contributors and region coverage | P0 | Planned
- 2 | Purchase path, Large Ride Pass, Organiser | P0 | Planned
- 2 | Switch free cap to 5 | P0 | Built
- 2 | Shop link in app | P1 | In build
- 3 | Trailmarks, challenges, contributor loop | P1 | In build
- 3 | Club ride events, QR check-in | P1 | Planned
- 3 | Sponsored challenge pilot | P2 | Hypothesis
- 4 | Re-run the model on measured data | P0 | Planned
- 4 | Trust audit; sync and garage decision | P0 | Planned
- 4 | Prune; second-region decision | P1 | Hypothesis
caption: Full table with objective, user problem, deliverables, dependencies, effort and metrics: product-roadmap.md.
sources: product-roadmap.md

## 16 | financials
status: Hypothesis
kicker: Financial scenarios
headline: A validation year, not a profit year.
sub: Three scenarios of planning assumptions. GMV, revenue, gross profit, contribution, opex and net kept apart.
stats:
- {{conservative.year.gmv|short}} / {{base.year.gmv|short}} / {{ambitious.year.gmv|short}} | GMV, year one: customer-paid incl. GST (not Myto's income) | Hypothesis
- {{conservative.year.revenue|short}} / {{base.year.revenue|short}} / {{ambitious.year.revenue|short}} | Revenue: Myto's own, ex-GST | Hypothesis
- {{conservative.year.grossProfit|short}} / {{base.year.grossProfit|short}} / {{ambitious.year.grossProfit|short}} | Gross profit: after store fees and product cost | Hypothesis
- {{conservative.year.contribution|short}} / {{base.year.contribution|short}} / {{ambitious.year.contribution|short}} | Contribution: after gateway, fulfilment, returns | Hypothesis
- {{conservative.year.opex|short}} / {{base.year.opex|short}} / {{ambitious.year.opex|short}} | Opex: fixed costs, before any founder pay | Hypothesis
- {{conservative.year.net|short}} / {{base.year.net|short}} / {{ambitious.year.net|short}} | Net, year one: no scenario is profitable | Hypothesis
- {{in.conservative.marTarget|num}} / {{in.base.marTarget|num}} / {{in.ambitious.marTarget|num}} | assumed active riders in Oct 2027 | Hypothesis
- {{conservative.breakEvenMar|num}} / {{base.breakEvenMar|num}} / {{ambitious.breakEvenMar|num}} | active riders for product-only break-even at the Oct 2027 mix | Hypothesis
caption: No scenario is profitable in year one. Base revenue includes {{base.year.partnerRev|short}} of sponsored challenges (a hypothesis); partnership fees count as revenue, not GMV.
assumptions: L = lakh (₹1,00,000); store fee {{shared.STORE_FEE|pct}}, GST {{shared.GST_RATE|pct}} (verify), pass {{shared.LARGE_PASS_PRICE|inr}}, organiser {{shared.ORGANISER_PRICE|inr}} a month; all inputs in financial-assumptions.md
sources: model.mjs; Apple Small Business Program and Google Play service fee pages, read 2026-11-12

## 17 | competitive
status: Built+Planned
kicker: Competitive positioning
headline: Trust in the trail is where we start. Events are where we catch up.
sub: One competitor reviewed. Evidence grade from the 2026-11-01 note.
items:
- Trail access with evidence and moderation | Built | Pins without a moderation story found | Their app not opened
- Records and navigates without a network | Built | Their blog calls offline a "mirage"; mesh not shipped | Blog only
- Live group map with rider status | Built | Yes, their most praised feature | Store, reviews
- Ride events with RSVP and check-in | Built+Planned | Yes | Store. Ours: club events with rider limit and check-in seen in the test build; QR check-in not verified
- Split expenses on a ride | Planned | New in their Oct 2026 update | Store. Ours: not built
- Paid rides | Planned | Off-app via UPI QR | Policy. Ours: not built
caption: Based only on docs/competitive (2026-11-01, public pages and store listings; app itself not opened). No claim of superiority beyond it. Other competitors not analysed.
sources: docs/competitive/2026-11-01-ridingverse-analysis.md

## 18 | vision-long
status: Hypothesis
kicker: Long-term vision
headline: Enjoy the ride. Explore more. Share the journey.
sub: A rider's year, on the road and on the page.
items:
- Year one | Prove trust and one honest paid path for organisers. Learn what riders and organisers will pay for.
- Year two | Decide on sync and garage; open a second region only if contributions show it.
- Beyond | Devices such as Myto Navi remain a stated companion idea (PRODUCT.md), not a commitment.
caption: Directions, not commitments. Nothing beyond Phase 4 is planned in detail.
img: welcome.webp
