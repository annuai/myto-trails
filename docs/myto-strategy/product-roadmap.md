# Product roadmap: Nov 2026 to Oct 2027

Written 2026-11-12, re-planned traction-first 2026-11-14. Status words: **Built** (in repo, tested), **In build** (other agents working now, not verified), **Planned**, **Hypothesis**. Effort is in person-weeks of one full-stack developer (S 1 to 2, M 3 to 5, L 6 to 10); these are estimates, not measured velocity. Priority: P0 gate, P1 should, P2 could.

Principle: traction before revenue. Clubs are the growth channel and a club ride is bigger than 5 riders, so group rides stay free (cap 100) until retention is measured. Each phase has one theme and one exit gate; the next starts only when the gate is met, so dates move, not scope quality. Weeks count from 16 Nov 2026.

```
0 Ship-ready        weeks 1-2    Android store track, ops debts, feature freeze
1 Club loop polish  weeks 2-4    club -> event -> WhatsApp link -> ride -> album
2 Club beta         weeks 4-10   3-5 Bengaluru clubs, founding riders, 30+ trails
3 Public launch     months 3-5   iOS, public stores, club-to-club growth
4 Monetisation      month 5+     only if retention holds; founding clubs grandfathered
```

## Phase 0: Ship-ready (weeks 1 to 2)

Theme: installable and safe for real users. Exit gate: build on Google Play internal or closed testing, the production items below done, `main` is what ships.

| # | Initiative | Status now | Objective | User problem | Deliverables | Depends on | Effort | Pri | Metrics |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Store readiness, Android first | Planned | Get the app onto a store | Riders cannot install it | Google Play developer account (one-time fee), listing, data-safety form, internal then closed track; Apple account later (Phase 3) | Owner buys account | S | P0 | Build accepted on Play testing |
| F7 | Production debts | Planned | Nothing breaks on first real use | Sign-in, photos or sweeps fail under real users | Migrations 0049 and 0050 on Supabase, `CRON_SECRET` equal on Vercel and GitHub, R2 custom domain (`r2.dev` is rate limited), quarantine lifecycle rule, Sentry on a device build ([todo](../todo.md)) | None | S | P0 | Checklist done; zero sign-in failures |
| F2 | Verify in-build work, feature freeze | In build | Know what actually works | Unverified features would be shown to clubs | Merge or close open branches; run each feature on a device; hide what fails (ADR 0009 pattern); no new features until Phase 2 | None | S | P0 | Checklist signed off |

## Phase 1: Club loop polish (weeks 2 to 4)

Theme: one path flawless rather than everything polished. Exit gate: a real club ride of 5+ riders run end to end on Myto with no blocking defect.

| # | Initiative | Status now | Objective | User problem | Deliverables | Depends on | Effort | Pri | Metrics |
|---|---|---|---|---|---|---|---|---|---|
| L1 | First run | Planned | Value in under 60 seconds | A new rider sees an empty or crowded app | Onboarding that lands on a club or a nearby trail | F2 | S | P0 | Time to first useful screen |
| L2 | Organiser loop | Partly built | Clubs can run a ride on Myto | Club rides run on chat and payment screenshots | Create club, post event, share link, join, live group ride, event album, all checked on device | F2 | M | P0 | Events created; joins per event |
| E4 | No-install event page | Partly built: club events with start time, meeting point, rider limit, going count and check-in are in the test build; web event page and QR check-in not built | A WhatsApp link works for anyone | Riders without the app cannot see or RSVP | Web event page with RSVP and app handoff ([universal-links](../universal-links.md)); QR check-in later | L2 | M | P0 | Invite link opened to joined |
| L3 | Android push | Planned | Clubs stay alive between rides | No signal that a ride was posted | Expo push with FCM (free, no Apple account): new club event, ride starting; same opt-out and quiet hours as local reminders ([todo](../todo.md)) | F1 | S | P0 | Opt-in rate; event views from push |

## Phase 2: Club beta (weeks 4 to 10)

Theme: real clubs, by hand, no ads. Exit gate: 3+ clubs each ran 4 weekend rides on Myto, 30+ approved trails in the launch radius, founding cohort at 50 riders.

| # | Initiative | Status now | Objective | User problem | Deliverables | Depends on | Effort | Pri | Metrics |
|---|---|---|---|---|---|---|---|---|---|
| B1 | Concierge club onboarding | Planned | 3 to 5 Bengaluru clubs | Clubs will not switch tools on a cold invite | Road captains the team knows; set up their club; ride their first Myto ride with them; ask for their next 4 rides | Phase 1 gate | M | P0 | Club rides per week; clubs with 2+ events a month |
| F4 | Founding contributor programme | Planned | 50 to 100 contributors | Directory is thin | Invite list, Founding mark, monthly ride-and-verify day with a club ([strategy 6.2](strategy.md)) | F2 | M | P0 | Contributors with 1+ approved item |
| F6 | Launch region coverage | Planned | Credible Bengaluru-radius directory | Riders find an empty app | 30+ approved trails in radius (assumption) | F4 | M | P0 | Approved trails in radius |
| B2 | Share cards | In build (`feat/share-to-instagram-stories` pushed) | Every ride advertises the app | Rides vanish after the weekend | Ride and event share cards, Instagram Stories | F2 | S | P1 | Shares; installs from shares |
| B3 | Feedback loop | Planned | Fix what clubs hit | Silent churn | Road-captain WhatsApp group, review every two weeks, their top 3 fixed first | B1 | S | P0 | Issues closed per cycle |
| F5 | Measurement without tracking | Built | Learn without ad identifiers | We do not know active riders | Anonymous PostHog analytics, on with an opt-out (docs/11); MAR = distinct app ids with `app_opened` in a calendar month | F1 | S | P1 | 4-week retention; invite conversion |

## Phase 3: Public launch (months 3 to 5)

Theme: widen only on a full directory. Exit gate: on both stores publicly, a second wave of clubs brought by the first.

| # | Initiative | Status now | Objective | User problem | Deliverables | Depends on | Effort | Pri | Metrics |
|---|---|---|---|---|---|---|---|---|---|
| P1 | iOS and public release | Planned | Reach iPhone riders | Half of a club cannot install | Paid Apple account, TestFlight, iOS push, both stores public | Phase 2 gate | M | P0 | Installs; store rating |
| P2 | Club-to-club referral | Planned | Clubs bring clubs | Growth limited to the founder's network | Organiser invite link, Founding club mark, public club page | B1 | S | P1 | Clubs joined by referral |
| P3 | Content | Planned | Reasons to open the app | Quiet weeks between rides | Trail of the month, ride reports, Fix it clips, contributor spotlight ([strategy 6.3](strategy.md)) | F6 | S | P1 | Shares |
| E1 | Trailmarks and achievements | In build | Reward reaching places | Rides vanish into a log | Marks for places and rides ridden; no speed-based or ranked achievements | F2 | M | P1 | Share of riders with 1+ Trailmark |
| E2 | Challenges (exploration, not speed) | In build | Reasons to ride a new place | The same few trails get ridden | Time-boxed trail challenges; none rewards speed or risk | E1 | M | P2 | Challenge participation |
| E3 | Contributor loop | In build | More verified data | Trails go stale | Contribution mapping to moderation; credit and Marks; opt-in leaderboard of verified contributions only | F4 | M | P1 | Verified items per month |

## Phase 4: Monetisation (month 5 onward, only if retention holds)

Theme: one honest purchase path for the people who organise. Entry gate: 4-week retention measured and holding. Exit gate: first real store purchase, no drop in free club rides.

| # | Initiative | Status now | Objective | User problem | Deliverables | Depends on | Effort | Pri | Metrics |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Purchase path (IAP / Play Billing) | Planned | Make capacity purchasable | Organiser hits the cap with no way to go larger | Store products, receipt validation, restore, server entitlement grant, refunds | F1, P1 | L | P0 | Purchase success rate |
| M2 | Large Ride Pass (about ₹99 hypothesis) | Cap logic built; purchase Planned | Revenue from larger rides | n/a while cap is 100 | Pass per ride; participants join free | M1 | S | P0 | Passes sold per large ride |
| M3 | Myto Organiser (₹249 to 299 a month hypothesis) | Planned | Recurring revenue from regular organisers | Road captains pay per ride repeatedly | Auto-renewing subscription, manage-subscription link | M1 | M | P1 | Organisers subscribed; churn |
| M4 | Lower the free cap | Built (config) | Make the cap real | n/a | New clubs only, notice two weeks earlier; founding clubs keep their terms; never during the beta | M1, M2 | S | P1 | Ride creation rate |
| M5 | Shop link in app | In build | Connect Equip to physical goods | Riders buy gear elsewhere | Labelled external shop, no in-app payment | F2 | S | P2 | Orders attributed |
| M6 | Pricing test | Planned | Learn willingness to pay | Prices are hypotheses | Vary price through entitlement config for new organisers only | M2, F5 | S | P2 | Conversion by price |
| E5 | Sponsored challenge pilot | Hypothesis | Test partner revenue | Brands want a fitting audience | One labelled sponsored challenge, no effect on trail data | E2 | S | P2 | Partner renewal intent |

Consolidation (C1 re-run the model on measured data, C2 sync and garage decision as an ADR, C3 trust audit against the 95% access-accuracy target, C4 second region, C5 prune) runs as a review at month 6 and month 12, not as a build phase. F3 (entitlement config) is built and needs nothing until M4. E6 (Year-in-rides 2027) carries over in December.

Not now: sync, garage, community heat map, video posts, a second region, advertising.

## Dependencies at a glance

F1 gates L3 and the beta; the Phase 1 gate gates B1; the Phase 2 gate gates public launch. M1 needs both store accounts and measured retention; M4 never runs during the beta.

## What changes the plan

If the Play account slips, run the beta on direct Android installs and keep Phase 1. If fewer than 3 clubs run 4 rides by week 10, fix the club loop before launching publicly. If the founding cohort is below 50, hold the public release rather than launch an empty directory.
