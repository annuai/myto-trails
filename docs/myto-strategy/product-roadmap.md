# Product roadmap: Nov 2026 to Oct 2027

Written 2026-11-12. Status words: **Built** (in repo, tested), **In build** (other agents working now, not verified), **Planned**, **Hypothesis**. Effort is in person-weeks of one full-stack developer (S 1 to 2, M 3 to 5, L 6 to 10); these are estimates, not measured velocity. Priority: P0 gate, P1 should, P2 could.

Principle: do not schedule everything at once. Each phase has one theme and one exit gate; the next phase starts only when the gate is met, so dates move, not scope quality.

```
Foundation      Nov-Jan   store-ready, verify what is in build, founding cohort
First monetis.  Feb-Apr   purchase path, Large Ride Pass, Organiser, Shop link
Engagement      May-Jul   Trailmarks and challenges, ride events, sponsored challenge pilot
Consolidation   Aug-Oct   measure, prune, sync/garage decision, year-two plan
```

## Phase 1: Foundation (Nov 2026 to Jan 2027)

Theme: be shippable and honest. Exit gate: app on at least one store track (TestFlight or Play internal) with a paid developer account, in-build features verified or cut, founding cohort at 50 riders.

| # | Initiative | Status now | Objective | User problem | Deliverables | Depends on | Effort | Pri | Metrics |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Store readiness | Planned | Get the app onto a store | Riders cannot install it; no billing without a store | Paid Apple developer account, Google Play developer account, store listings, privacy labels, review pass | Owner buys accounts (`docs/todo.md`) | M | P0 | Build accepted on TestFlight and Play internal |
| F2 | Verify in-build work | In build | Know what actually works | Unverified features would be marketed | Run Shop discovery, achievements/Trailmarks/challenges, contribution mapping on device; cut or fix | The other agents' work | M | P0 | Checklist signed off; defects open |
| F3 | Entitlement config in production | Built (unit-tested) | Prices and limits as configuration | Hard-coded limits block experiments | Configure limits (5/20/50) off by default; admin docs | None | S | P1 | A limit changes without a deploy |
| F4 | Founding contributor programme | Planned | 50 to 100 contributors | Directory is thin | Invite list, Founding mark, ride-and-verify days (strategy 6.2) | F2 (contribution mapping) | M | P0 | Contributors with 1+ approved item; median days to moderate |
| F5 | Measurement without tracking | Planned | Learn without ad identifiers | We do not know active riders | Consent-based, aggregate product analytics (`docs/15`: off until the rider agrees); define MAR | F1 | S | P1 | MAR defined and reported monthly |
| F6 | Launch region coverage | Planned | Credible Bengaluru-radius directory | Riders find an empty app | 30+ approved trails in radius (assumption) | F4 | M | P1 | Approved trails in radius |

Not now: new monetisation code beyond configuration.

## Phase 2: First monetisation (Feb to Apr 2027)

Theme: one honest purchase path for the people who organise. Exit gate: first real paid purchase made through a store, free cap switched to 5 for new rides, no regression in free group-ride use.

| # | Initiative | Status now | Objective | User problem | Deliverables | Depends on | Effort | Pri | Metrics |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Purchase path (IAP / Play Billing) | Planned | Make capacity purchasable | Organiser hits the cap with no way to go larger | Store products (Large Ride Pass, Organiser), receipt validation, restore purchases, server entitlement grant, refund handling | F1, F3 | L | P0 | Purchase success rate; entitlement mismatches (target zero) |
| M2 | Large Ride Pass (max 20, about ₹99 hypothesis) | Cap logic built; purchase Planned | Revenue from larger rides | Free cap of 5 too small for a club ride | Pass product per ride; organiser prompt already built; participants join free | M1 | S | P0 | Passes sold per large ride; free-ride completion unchanged |
| M3 | Myto Organiser (max 50, ₹249 to 299 per month hypothesis) | Planned | Recurring revenue from regular organisers | Road captains pay per ride repeatedly | Auto-renewing subscription with compliant terms, manage-subscription link | M1 | M | P1 | Organisers subscribed; churn |
| M4 | Switch free cap to 5 | Built (config) | Make the cap real | n/a | Flip config after M1 is live; in-app notice two weeks earlier; grandfather rides in progress | M1, M2 | S | P0 | Complaints; ride creation rate |
| M5 | Shop link in app | In build | Connect Equip to physical goods | Riders buy gear elsewhere, no link to trip context | Shop discovery layer (labelled, external `shop.myto-moto.com`), no in-app payment | F2 | M | P1 | Shop link opens; orders attributed |
| M6 | Pricing test | Planned | Learn willingness to pay | Prices are hypotheses | Vary price through entitlement config for new organisers only | M2, F5 | S | P2 | Conversion by price point |

Not now: advertising, event ticketing, in-app payment for physical goods.

## Phase 3: Engagement (May to Jul 2027)

Theme: reasons to return that celebrate exploration. Exit gate: riders retained across two months measurably; one sponsored challenge run with the labelling rules intact.

| # | Initiative | Status now | Objective | User problem | Deliverables | Depends on | Effort | Pri | Metrics |
|---|---|---|---|---|---|---|---|---|---|
| E1 | Trailmarks and achievements | In build | Reward reaching places | Rides vanish into a log | Marks for places and rides ridden; no speed-based or ranked achievements | F2 | M | P1 | Share of riders with 1+ Trailmark; two-month retention |
| E2 | Challenges (exploration, not speed) | In build | Reasons to ride a new place | The same few trails get ridden | Time-boxed trail challenges; none rewards speed or risk | E1 | M | P1 | Challenge participation |
| E3 | Contributor loop | In build | More verified data | Trails go stale | Contribution mapping to moderation; credit and Marks only, no leaderboards | F4 | M | P0 | Verified items per month; freshness |
| E4 | Ride events (RSVP, check-in, QR) | Partly built: club events with start time, meeting point, rider limit, going count and check-in an hour before are visible in the test build; QR check-in and a no-install event page are not verified | Finish the main competitor gap | Club rides run on chat and payment screenshots | Verify the existing club event flow, add QR check-in into the group ride and a web event page | M1, clubs | M | P1 | Events created; check-ins |
| E5 | Sponsored challenge pilot | Hypothesis | Test partner revenue | Brands want a fitting audience | One labelled sponsored challenge, partner pays Myto directly, no effect on trail data | E2, labelling rules | S | P2 | Partner renewal intent |
| E6 | Year-in-rides 2027 | Built (2026 version) | Annual share moment | Riders want to share the journey | Carry over recap and share card | None | S | P2 | Shares |

Not now: leaderboards, public rider rankings, ads.

## Phase 4: Consolidation (Aug to Oct 2027)

Theme: decide with evidence. Exit gate: year-two plan with measured MAR, conversion and cost; explicit keep/cut list.

| # | Initiative | Status now | Objective | User problem | Deliverables | Depends on | Effort | Pri | Metrics |
|---|---|---|---|---|---|---|---|---|---|
| C1 | Measure and re-run the model | Planned | Replace assumptions with data | The plan rests on inputs | Update `model.mjs` from measured MAR, conversion, orders; republish deck | F5, M1 | S | P0 | Share of inputs measured |
| C2 | Sync and garage decision | Planned | Choose the next platform investment | Data is local only | Decide on `docs/sync-design.md` (not built) given retention data | C1 | S | P1 | Decision recorded as an ADR |
| C3 | Moderation and trust audit | Planned | Protect the moat | Access accuracy must stay high | Audit a sample against the `PRODUCT.md` target (access accuracy 95% or more) | E3 | M | P0 | Audit accuracy |
| C4 | Second region | Hypothesis | Expand only if Bengaluru works | Riders elsewhere | Choose from contribution evidence | C1, C3 | M | P2 | Contributors in new region |
| C5 | Prune | Planned | Cut what is unused | Feature sprawl | Remove or fold low-use features (ADR 0009 pattern) | C1 | S | P1 | Features removed |

## Dependencies at a glance

F1 (store accounts) gates M1, which gates M2, M3 and M4. F2 (verify in-build) gates M5, E1, E2 and E3. Nothing in Phases 2 to 4 starts building until its gate is met.

## What changes the plan

If store accounts slip, Phase 2 slips month for month, and Phase 3 content work (E1 to E3) can run first because it needs no billing. If the founding cohort is below 50 by January, hold the public release rather than launch an empty directory.
