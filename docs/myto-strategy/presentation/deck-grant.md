# Myto Moto grant application: canonical content (14 slides)

The grant version of the pitch: one slide per application question, in the form's order, so a reviewer can follow the form. `DECK=grant node build.mjs` (see `npm run grant:build`). Same format, layouts, model and assets as `deck-pitch.md`; the kicker names the question it answers. The written answers, with short and long versions and their word counts, live in `grant-answers.md`. Market figures are cited public data; every forward-looking or impact figure is an assumption.

## 01 | cover
status: Confidential, Nov 2026
kicker: Q01 · Brief of the startup
headline: Myto Moto
sub: The operating system for motorcyclists.
body:
- Myto Moto puts trails, rides, group safety, fuel and gear in one app for India's touring riders. Built in Bengaluru, working today as a full test build.
caption: Market figures are cited; every forward-looking or impact figure is a planning assumption.
img: ending.webp

## 02 | story
kicker: Q02 · What problem, and for whom
chapter: Touring and weekend riders, and their clubs
headline: Riders run their passion on apps never built for riders.
sub: Maps, chat groups, sheets and reels, stitched together by hand for every ride.
items:
- Plan | Trails hide in reels and DMs. Nobody can say if a route is open, legal or rideable after rain.
- Ride together | Groups coordinate at 80 km/h over chat. The lead cannot see who dropped back.
- Stay safe | Hours without signal in the ghats and Ladakh. Nobody can see the rider.
img: welcome.webp
imgpos: 30% 50%
alt: A rider looking out over a mountain road
caption: From the founder's own rides. Structured rider interviews are the first milestone.

## 03 | partnerships
kicker: Q03 · Why it matters
headline: More riders go further every year, with nothing built to keep them safe.
sub: The riders are growing fast. The tools they ride with are not.
items:
- Safety off the grid | A fall in a dead zone is found at the next chai stop. Help depends on luck.
- A growing ride culture | Bikes above 150 cc rose from 14% to 19% of motorcycle sales, FY19 to FY25.
- Touring went mainstream | Ladakh drew 6.1 lakh domestic tourists in 2024. Riding there is a rite of passage.
- Land and trails | Riders without trusted access information end up on closed or private land.
img: o01-roadside-stop.webp
alt: Riders resting at a roadside stop
caption: Premium share: Crisil, via Autocar Pro. Ladakh arrivals: Government data tabled in the Lok Sabha.

## 04 | story
kicker: Q04 + Q05 · The problem in one sentence
chapter: In one sentence
headline: Every ride, pieced together by hand.
sub: India's touring motorcyclists plan, ride and stay safe across a patchwork of maps, chat groups and social posts, so trails go unverified, groups lose riders, and a rider in trouble off the grid has no one watching.
items:
- Who | Touring and weekend riders, ride leaders and clubs.
- What breaks | Planning, group coordination and safety, all done by hand.
- What it costs | Lost weekends, scattered groups, and risk where there is no signal.
img: trails.webp
imgpos: 62% 50%
alt: A dirt trail through hills near Bengaluru

## 05 | solution
status: Built+In build
kicker: Q06 · The product and how it solves it
headline: Myto Moto: one Rider OS.
sub: Everything a rider needs before, during and after the ride, in one app that works without signal.
items:
- Explore | Built | Verified trails with access and condition, GPX, route planning, offline maps. | maps.webp
- Ride | Built | Ride recording, journal, fuel log and costs, reminders, a yearly recap. | record.webp
- Ride together | Built | Live group map, rider status, SOS and quick signals, clubs. | group.webp
- Equip | Built+In build | Fix-it guides for the roadside today. A curated Shop next. | adventure-body.webp
caption: Status as of 13 Nov 2026. In-build items are not yet shipped.

## 06 | demo
status: Built
kicker: Q06 · Working today
headline: Working today, not a mockup.
sub: A full test build, from a trail you can trust to a group ride home.
items:
- Find a trail you can trust | Access, condition and evidence, checked before you leave.
- Record every ride | Distance, time, fuel and a journal, even with no signal.
- Ride together, safely | A live group map, rider status and one-tap SOS.
shot: dash.jpg
caption: A real frame from the Nov 2026 test build, with test data. The store release is the first milestone.
sources: video/public/capture

## 07 | vision
status: Built
kicker: Q07 · What is different
headline: We connect the whole ride.
sub: Trail, ride, group and gear in one place.
items:
- Verified trails | Built | Every trail carries access status and evidence, checked before it is published.
- Offline first | Built | Maps, ride records and group status keep working where the signal ends.
- Safety built in | Built | Live group map, rider status and SOS, free for every rider.
- Trust over a feed | Built | Curated trails, no leaderboards that reward speed. Safety data is never sold.
img: rider-on-ridge.webp
alt: A rider on a mountain ridge
caption: Compared with the apps on the competition slide, from their public store listings, Nov 2026.

## 08 | audience
kicker: Q08 · Market size and target market
headline: India buys a million big bikes a year. Nobody built their software.
sub: Premium motorcycles are India's fastest-growing two-wheeler segment, and their riders spend on the ride.
items:
- Bought every year | Sold: 11 lakh | Motorcycles above 250 cc sold in India in FY25. Royal Enfield alone sold 9 lakh at home.
- Riders on the road | Base: 50 lakh+ | Five years of big-bike sales: riders who tour, ride in groups and buy gear.
- Our beachhead | Start: Bengaluru | Weekend riders and clubs around our verified trails. Then Pune, Delhi NCR and Mumbai.
caption: 11 lakh ≈ Royal Enfield's 9.03 lakh FY25 domestic sales at its 80%+ share of 250 cc+. 50 lakh+ is our five-year estimate.
sources: Eicher Motors FY25; Autocar Pro; CareEdge FY25 report
img: group.webp

## 09 | audience
status: Hypothesis
kicker: Q09 · Who benefits, and the impact
headline: Safer rides for riders, and peace of mind for the people at home.
sub: Intended impact. We start measuring it at the store release.
items:
- Riders | Gains: Safer rides | Trusted trails, offline records and SOS, in a core that stays free.
- Ride leaders | Gains: No one lost | A live map of the whole group and one-tap signals, not calls at speed.
- Families | Gains: Peace of mind | A check-in link shows the expected return, and where the rider was last seen if late.
img: o02-large-group-road.webp
alt: A large group of riders on a mountain road
caption: Intended, not measured. First measures: group rides with safety on, check-ins sent, trails checked.

## 10 | landscape
kicker: Q10 · Key competitors
headline: Every app solves one slice. None connects them.
sub: The default is maps plus chat. Specialist apps each cover one part of the ride.
items:
- Maps and WhatsApp | The default stack | Navigation and chat. Free, everywhere, built for no rider in particular. | We add: rider trails, group status and SOS in one place.
- Riding Verse, WingManX | India group-ride apps | Live group map, clubs, events, tow assist. | We add: verified trails, offline ride records, fuel and gear.
- REVER, Calimoto | Global ride trackers | Ride tracking and twisty-route navigation; offline is paid. | We add: India trails with access status, free offline maps.
- The Good Biker | India rider social app | Tracking, clubs, garage, feed, marketplace. | We add: trust over a feed. Curated trails, no rankings.
caption: From public store listings and press, Nov 2026. Their apps were not tested; claims are theirs.
sources: docs/competitive

## 11 | monetisation
status: Hypothesis
kicker: Q11 · Business model
headline: Riders ride free. Organisers, gear and partners pay.
sub: A free core builds the network. Revenue comes from those who get the most value.
items:
- Large Ride Pass | {{shared.LARGE_PASS_PRICE|inr}} a ride, organiser pays, 6 to 20 riders | Implement | 33
- Myto Organiser | {{shared.ORGANISER_PRICE|inr}} a month for clubs and ride leaders | Implement | 34
- Myto Originals | Own-brand gear, ~{{in.base.originalsGM|pct}} gross margin | Implement | 32
- Curated Shop | ~{{in.base.curatedCommission|pct}} commission on partner gear | Implement | 33
- Sponsored challenges | Brands pay {{in.base.partnerFee|inr}} per labelled challenge | Validate | 28
caption: Prices and margins are base-case assumptions. Bars are our priority score across nine axes. Safety and trail data are never for sale.
sources: monetisation-model.md; model.mjs

## 12 | problem
status: Hypothesis
kicker: Q12 · Social and environmental impact
headline: Safer roads, cared-for trails, and fuel you can see.
sub: Intended impact, built into the product rather than added on.
items:
- Road safety | SOS, rider status and a live group map for every rider, free, even with no signal.
- Trail care | Only trails with checked access are published, which keeps riders off closed land and fragile ground.
- Fuel you can see | A fuel log shows each rider what the bike really burns, the first step to riding more efficiently.
img: safety.webp
alt: Riders on a trail, one stopped to help another
caption: Intended, not measured. No emissions saving is claimed; we will report fuel logged per km once riders use the store build.

## 13 | opportunity
status: Built+Planned
kicker: Traction and next steps
headline: Built before raising a rupee.
sub: One founder, a working product, verified trails and a clear next 90 days.
items:
- Built | Built | A full test build: trails, ride recording, fuel log, group rides, SOS, clubs, Fix-it.
- Built | Built | Verified trails near Bengaluru with access evidence, and the tools to moderate them.
- Built | Built | A free-tier stack: running costs near zero until revenue exists.
- Next 90 days | Planned | Release on the App Store and Play Store.
- Next 90 days | Planned | 50 to 100 founding riders and club road captains in Bengaluru.
- Next 90 days | Planned | The first paid group ride, and the first safety and retention numbers.
caption: Product status as of 13 Nov 2026. No users or revenue yet: we start measuring at the store release.
sources: apps/web/data/trails
img: setup.webp

## 14 | ask
status: Hypothesis
kicker: The ask
headline: Funding to launch the Rider OS.
sub: 18 months to reach the stores, win Bengaluru's riders and prove revenue.
items:
- Team, {{raise.teamPct|pct}} | A mobile developer and a marketing lead join the founder. | Milestone: from one to three
- Growth, {{raise.growthPct|pct}} | Rider creators, club rides, content, trail checks. | Milestone: {{in.base.marTarget|num}} active riders
- Ops and buffer, {{raise.opsPct|pct}} | Tools, legal, devices, a 15% buffer. | Milestone: raise again on data
- Myto Originals, {{raise.originalsPct|pct}} | A first small batch of own gear. | Milestone: first Originals sold
raise: {{raise.ask|cr}} | 18 months of runway | Hypothesis
note: About {{raise.burn|lakh}} a month at full team. Enjoy the ride. Explore more. Share the journey.
img: o03-evening-camp.webp
caption: Bottom-up budget; salaries are 2026 estimates. Match the amount to the grant's limit.
sources: model.mjs (RAISE_INPUTS)
