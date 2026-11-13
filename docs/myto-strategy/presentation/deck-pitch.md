# Myto Moto investor pitch: canonical content (15 slides)

The founder's pre-seed pitch, built from the strategy deck's layouts, model and assets: `DECK=pitch node build.mjs` (see `npm run pitch:build`). Same format as `deck-content.md`; words come only from here, numbers from `../model.mjs`. Arc: origin story (3 chapters), problem, Rider OS, product, market, why now, model, metrics, built so far, competition, vision, ask. Market figures are cited public data; every forward-looking figure is a model assumption. The `story` layout is pitch-only (`chapter:` and `imgpos:` keys).

## 01 | cover
status: Confidential, Nov 2026
kicker: Pre-seed pitch
headline: Myto Moto
sub: The operating system for motorcyclists.
body:
- Trails, rides, safety, fuel and gear. One app, and one brand, for every rider in India.
caption: Built in Bengaluru. Market figures are cited; every forward-looking figure is a planning assumption.
img: ending.webp

## 02 | story
kicker: Why I am building this
chapter: Chapter 1 · Ladakh
headline: It started on the road to Ladakh.
sub: The ride of a lifetime. I spent more time planning it than riding it.
items:
- Planning lived in ten places | Routes in maps, fuel stops in a sheet, permits in my gallery, advice in old forums.
- Fuel was a guess | Long gaps between pumps, and no record of what the bike really used at altitude.
- Off the grid, off the radar | Hours without signal. Nobody at home, or in our group, could see us.
img: welcome.webp
imgpos: 30% 50%
caption: The founder's own ride. These pains are being tested in structured rider interviews.

## 03 | story
kicker: Why I am building this
chapter: Chapter 2 · Bengaluru
headline: Then every weekend became a search.
sub: Bengaluru is ringed by ghats, coffee estates and dirt trails. Finding them, and trusting them, is the hard part.
items:
- Trails hide in reels | The best routes live in posts, DMs and word of mouth, never in one trusted place.
- Can I ride it this weekend? | Is it open, legal, rideable after rain? A pin on a map cannot tell you.
- Saturdays lost to scrolling | Hours of planning for a three-hour ride, then the same old highway.
img: trails.webp
imgpos: 62% 50%

## 04 | story
kicker: Why I am building this
chapter: Chapter 3 · The group ride
headline: And every group ride lost someone.
sub: Riding together is the best part of the sport, and the most chaotic.
items:
- "Where are you?" | Calls at 80 km/h, and a shared location frozen twenty minutes ago.
- Nobody sees the whole group | The lead cannot see who dropped back. The sweep cannot see where the lead turned.
- When something goes wrong | A fall in a dead zone, and the group finds out at the next chai stop.
img: o02-large-group-road.webp
imgpos: 22% 50%
caption: Myto Moto is the app I wanted on each of those rides.

## 05 | problem
status: Hypothesis
kicker: The problem
headline: Riders run their passion on apps never built for riders.
sub: Maps, chat groups, spreadsheets and Instagram, stitched together by hand every weekend.
items:
- Plan | Trails, routes, fuel stops and permits are scattered across maps, reels, forums and sheets.
- Ride | Group tracking runs on chat, safety runs on luck, and the ride leaves no record.
- Own | Fuel, service, documents and gear live in notes and galleries, or nowhere at all.
caption: From the founder's rides and product research. Structured rider interviews are the first milestone of this round.
img: safety.webp

## 06 | solution
status: Built+In build
kicker: The solution
headline: Myto Moto: one Rider OS.
sub: Everything a rider needs before, during and after the ride, in one app.
items:
- Explore | Built | Verified trails with access and condition, GPX, route planning, offline maps. | maps.webp
- Ride | Built | Ride recording, journal, fuel log and costs, reminders, a yearly recap. | record.webp
- Ride together | Built | Live group map, rider status, SOS and quick signals, clubs. | group.webp
- Equip | Built+In build | Fix-it guides for the roadside today. A curated Shop next. | adventure-body.webp
caption: Status as of 13 Nov 2026. In-build items are not yet shipped.

## 07 | demo
status: Built
kicker: Product
headline: Working today, not a mockup.
sub: A full test build, from a trail you can trust to a group ride home.
items:
- Find a trail you can trust | Access, condition and evidence, checked before you leave.
- Record every ride | Distance, time, fuel and a journal, even with no signal.
- Ride together, safely | A live group map, rider status and one-tap SOS.
shot: dash.jpg
caption: A real frame from the Nov 2026 test build, with test data. The store release is the first milestone of this round.
sources: video/public/capture

## 08 | audience
kicker: Market
headline: India buys a million big bikes a year. Nobody built their software.
sub: Premium motorcycles are India's fastest-growing two-wheeler segment, and their riders spend on the ride.
items:
- Bought every year | Sold: 11 lakh | Motorcycles above 250 cc sold in India in FY25. Royal Enfield alone sold 9 lakh at home.
- Riders on the road | Base: 50 lakh+ | Five years of big-bike sales: riders who tour, ride in groups and buy gear.
- Our beachhead | Start: Bengaluru | Weekend riders and clubs around our verified trails. Then Pune, Delhi NCR and Mumbai.
caption: 11 lakh ≈ Royal Enfield's 9.03 lakh FY25 domestic sales at its 80%+ share of 250 cc+. 50 lakh+ is our five-year estimate.
sources: Eicher Motors FY25; Autocar Pro; CareEdge FY25 report
img: group.webp

## 09 | partnerships
kicker: Why now
headline: Riders are upgrading. Their tools are not.
sub: Four shifts make this the moment for a rider-first platform.
items:
- Premium is booming | Bikes above 150 cc grew from 14% to 19% of motorcycle sales, FY19 to FY25.
- Touring went mainstream | Ladakh drew 6.1 lakh domestic tourists in 2024. Riding there is a rite of passage.
- Clubs run on chat | Group rides, payments and safety are coordinated in chats never built for it.
- The phone is enough | Offline maps, background GPS and SOS now work with no extra hardware.
caption: Premium share: Crisil, via Autocar Pro. Ladakh arrivals: Government data tabled in the Lok Sabha.
img: o01-roadside-stop.webp

## 10 | monetisation
status: Hypothesis
kicker: Business model
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

## 11 | financials
status: Hypothesis
kicker: Business metrics
headline: Year one buys proof. Break-even at {{base.breakEvenMar|num}} riders.
sub: Three scenarios from one model. Base case: store launch in March 2027 and {{in.base.marTarget|num}} active riders by October.
stats:
- {{in.conservative.marTarget|num}} / {{in.base.marTarget|num}} / {{in.ambitious.marTarget|num}} | Active riders: October 2027
- {{conservative.year.revenue|short}} / {{base.year.revenue|short}} / {{ambitious.year.revenue|short}} | Revenue: Year one, ex-GST
- {{conservative.last.revenue|short}} / {{base.last.revenue|short}} / {{ambitious.last.revenue|short}} | Monthly revenue: October 2027
- {{conservative.year.grossProfit|short}} / {{base.year.grossProfit|short}} / {{ambitious.year.grossProfit|short}} | Gross profit: After store fees, cost
- {{conservative.year.net|short}} / {{base.year.net|short}} / {{ambitious.year.net|short}} | Net, year one: Before team pay
- {{conservative.breakEvenMar|num}} / {{base.breakEvenMar|num}} / {{ambitious.breakEvenMar|num}} | Break-even riders: Product revenue only
caption: Planning assumptions, not forecasts. Opex excludes team pay. L = lakh. October revenue includes a sponsored challenge in the base and ambitious cases.
sources: model.mjs; financial-assumptions.md

## 12 | opportunity
status: Built+Planned
kicker: Traction
headline: Built before raising a rupee.
sub: One founder, a working product, verified trails and a clear next 90 days.
items:
- Built | Built | A full test build: trails, ride recording, fuel log, group rides, SOS, clubs, Fix-it.
- Built | Built | Verified trails near Bengaluru with access evidence, and the tools to moderate them.
- Built | Built | A free-tier stack: running costs near zero until revenue exists.
- Next 90 days | Planned | Release on the App Store and Play Store.
- Next 90 days | Planned | 50 to 100 founding riders and club road captains in Bengaluru.
- Next 90 days | Planned | The first paid group ride, and the first retention numbers.
caption: Product status as of 13 Nov 2026. No users or revenue yet: we start measuring at the store release.
sources: apps/web/data/trails
img: setup.webp

## 13 | landscape
kicker: Competition
headline: Others built a feature. We are building the Rider OS.
sub: Every app solves one slice. None connects the trail, the ride, the group and the gear.
items:
- Maps and WhatsApp | The default stack | Navigation and chat. Free, everywhere, built for no rider in particular. | We add: rider trails, group status and SOS in one place.
- Riding Verse, WingManX | India group-ride apps | Live group map, clubs, events, tow assist. | We add: verified trails, offline ride records, fuel and gear.
- REVER, Calimoto | Global ride trackers | Ride tracking and twisty-route navigation; offline is paid. | We add: India trails with access status, free offline maps.
- The Good Biker | India rider social app | Tracking, clubs, garage, feed, marketplace. | We add: trust over a feed. Curated trails, no rankings.
caption: From public store listings and press, Nov 2026. Their apps were not tested; claims are theirs.
sources: docs/competitive

## 14 | vision-long
status: Planned
kicker: Vision
headline: From app to rider brand.
sub: The app earns the rider's trust. The brand earns a place in the garage.
items:
- Now | The Rider OS: trails, rides, safety, fuel and clubs, free for every rider.
- Next | The Myto Shop: curated gear and Myto Originals, sold where riders already plan.
- Later | Our own products, such as the Trail Beam light and Navi: designed, sold and supported by Myto.
caption: Shop and hardware are future scope, not commitments. Product names are working titles.
img: e03-touring-kit-flatlay.webp
imgpos: 30% 50%

## 15 | ask
status: Hypothesis
kicker: The raise
headline: Raising {{raise.ask|cr}} to launch the Rider OS.
sub: 18 months to reach the stores, win Bengaluru's riders and prove revenue.
items:
- Team, {{raise.teamPct|pct}} | A mobile developer and a marketing lead join the founder. | Milestone: from one to three
- Growth, {{raise.growthPct|pct}} | Rider creators, club rides, content, trail checks. | Milestone: {{in.base.marTarget|num}} active riders
- Ops and buffer, {{raise.opsPct|pct}} | Tools, legal, devices, a 15% buffer. | Milestone: raise again on data
- Myto Originals, {{raise.originalsPct|pct}} | A first small batch of own gear. | Milestone: first Originals sold
raise: {{raise.ask|cr}} | Pre-seed, 18 months of runway | Hypothesis
note: About {{raise.burn|lakh}} a month at full team. Enjoy the ride. Explore more. Share the journey.
img: o03-evening-camp.webp
caption: Bottom-up budget: Bengaluru salaries are 2026 estimates, not quotes. Marketing covers ~15,000 to 20,000 installs at ₹100 to 150 each.
sources: model.mjs (RAISE_INPUTS)
