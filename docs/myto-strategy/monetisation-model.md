# Monetisation model

Written 2026-11-12. Everything priced here is a **hypothesis** to be tested; nothing is live. Billing is not built into a store path, the app is on no store, and the free group-ride cap is still 100 until a purchase path exists. Numbers live in [model.mjs](model.mjs).

## 1. Architecture

Riders and participants use Myto free. Revenue comes from the people who need more than the free product gives: organisers who need capacity, riders who want gear, and (later) partners who want a fit audience.

```
Free for everyone       Explore, Ride, Fix-it, clubs, group rides up to 5 (incl. organiser)
Organiser pays          Large Ride Pass (6-20, per ride)  |  Myto Organiser (up to 50, monthly)
Rider buys (external)   Myto Shop: Originals + curated third party, physical goods only
Partner pays            Sponsored, labelled challenges and route partners (hypothesis)
Participants            never pay, in any group ride
```

Limits, prices and plan names are rows in the entitlement table (built, unit-tested), so they change by configuration. Values here are starting hypotheses: free 5, Large Ride Pass max 20 at about ₹99 per ride, Organiser max 50 at ₹249 to 299 per month.

## 2. The seven revenue streams

| # | Stream | Who pays | Mechanism | Status | Takes from |
|---|---|---|---|---|---|
| 1 | Large Ride Pass | Organiser, per ride | Store purchase (digital unlock) | Cap logic built; purchase Planned | Store fee 15% (see §4) |
| 2 | Myto Organiser | Organiser, monthly | Store subscription | Planned | Store fee 15% |
| 3 | Shop: Myto Originals | Rider | Margin on own products, external store | Shop discovery In build | Product cost, payment, fulfilment, returns |
| 4 | Shop: curated third party | Rider (partner pays commission) | Affiliate/referral commission | Shop discovery In build | Partner terms |
| 5 | Sponsored challenges and route partners | Brand partner | Fixed fee, labelled | Hypothesis | Delivery cost |
| 6 | Advertising | Advertiser | Labelled placements | Defer | n/a |
| 7 | Event ticketing take | Organiser/rider | Percentage of ticketed ride price | Hypothesis (competitor gap, `docs/competitive` §4A) | Payment fees, compliance |

GMV versus Myto's take: in streams 3 and 4 the customer's payment is GMV. Myto's income is the margin on Originals and only the commission on curated sales. The model keeps these apart.

## 3. Prioritisation matrix (nine axes)

Axes (my choice, since none was prescribed; edit to taste): **Rider value, Brand/trust fit, Revenue potential (year 1), Time to first revenue, Build effort (5 = small), Running cost (5 = free to run), Platform policy risk (5 = low), Legal/compliance risk (5 = low), Scalability.** Scores 1 to 5, 5 favourable. These are judgement scores, not data.

| Stream | Value | Fit | Rev | Time | Effort | Cost | Platform | Legal | Scale | Total | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 Myto Organiser | 4 | 5 | 3 | 3 | 3 | 5 | 3 | 4 | 4 | 34 | **Implement** (Feb-Apr) |
| 1 Large Ride Pass | 4 | 5 | 3 | 3 | 3 | 5 | 3 | 4 | 3 | 33 | **Implement** (Feb-Apr) |
| 4 Curated affiliate | 3 | 4 | 2 | 4 | 4 | 5 | 5 | 3 | 3 | 33 | **Implement** as Shop link |
| 3 Originals | 3 | 4 | 3 | 4 | 4 | 3 | 5 | 3 | 3 | 32 | **Implement** as Shop link (cash for stock is the constraint) |
| 5 Sponsored challenges | 3 | 3 | 3 | 2 | 3 | 4 | 5 | 3 | 2 | 28 | **Validate**: one pilot after Trailmarks (E5) |
| 7 Event ticketing | 4 | 4 | 3 | 2 | 1 | 3 | 3 | 1 | 4 | 25 | **Validate**: demand first; payments and refunds carry compliance cost |
| 6 Advertising | 1 | 1 | 2 | 2 | 3 | 4 | 4 | 2 | 3 | 22 | **Defer** |

Reading: the first three are the only ones that fit the product principle (organiser pays, participants never pay) and need no new trust trade-off. Advertising is deferred because it scores worst on fit and value and the rider base is far too small for it to matter in year one.

## 4. Apple and Google rules for digital unlocks

Read 2026-11-12. These are the pages as fetched; I did not assume anything not stated. Confirm again before billing work starts, because both change.

**Apple, App Review Guidelines** (https://developer.apple.com/app-store/review/guidelines/, fetched 2026-11-12; the page showed no revision date I could read; the text I read covered about the first 100,000 of 114,000 characters):
- 3.1.1: unlocking features or functionality "by way of example: subscriptions, in-game currencies, game levels, access to premium content, or unlocking a full version" must use in-app purchase; apps may not use their own mechanisms to unlock functionality (license keys, QR codes, and so on). **A larger group ride is a feature unlock, so Large Ride Pass and Myto Organiser must use in-app purchase on iOS.**
- 3.1.1(a): apps may apply for entitlements to link to a permitted destination for digital purchases; these entitlements are not required in United States storefront apps. Outside the US storefront, buttons or links directing people to other purchase methods are not allowed unless an entitlement applies. **Not verified: whether such an entitlement is available for India.** Plan on in-app purchase.
- 3.1.2: auto-renewing subscriptions are allowed; period at least seven days; available across the user's devices.
- 3.1.3(e): physical goods or services consumed outside the app must use payment methods other than in-app purchase. **The Shop, which sells physical goods only, fits this, so it may stay on `shop.myto-moto.com`.** I did not read how App Review treats a link from the app to an external store; confirm with a review submission.
- Small Business Program (https://developer.apple.com/app-store/small-business-program/, fetched 2026-11-12, page shows copyright 2026 only): 15% commission for developers with up to USD 1 million in prior-year proceeds; 10% on subscriptions after year one, per the page.

**Google Play, Payments policy** (https://support.google.com/googleplay/android-developer/answer/10281818, fetched 2026-11-12, page shows no update date, only copyright 2026):
- Digital goods, subscriptions and app functionality or content must use Google Play's billing system, unless the policy permits otherwise.
- Physical goods and services are exempt.
- India and South Korea: alternative billing may be offered alongside Google Play's for in-app purchases, with the service fee reduced by 4 percentage points, per the page. Requirements for the programme were not read; I assume nothing about eligibility or integration cost.

**Google Play service fees** (https://support.google.com/googleplay/android-developer/answer/112622, fetched 2026-11-12): for remaining markets, 15% on the first USD 1 million of annual developer revenue, 30% above it, and 15% for auto-renewing subscriptions, per the page. The page states regional new-fee dates (EEA, UK, US on 2026-06-30; Australia and Japan 2026-09-30); India is not named, so I treat it as a remaining market.

**Consequences used in the model:** digital revenue loses 15% to the store (`STORE_FEE`), and the model never reaches the USD 1 million threshold. Prices are shown to customers inclusive of GST; the store fee is applied to the ex-GST amount, a simplification to verify with an accountant (the stores' own tax handling in India was not researched).

**Design rules that follow:** participants join free and never see a paywall; the buyer is the organiser, in-app; the web or Shop never sells an unlock, only physical goods; an entitlement is granted by the server after a verified receipt; "restore purchases" ships with the first purchase build.

## 5. Advertising and partnership rules

Advertising is deferred, but the rules are fixed now so nothing built later can break them:

1. **Always labelled.** Every commercial item carries a visible label: Sponsored, Partner, Affiliate, or Myto Original, in text, not colour alone.
2. **Never influences safety, trail condition, verification or rankings.** No partner can change an access status, a condition report, a verification state, search order, a recommendation or a moderation outcome. Commercial placements sit in their own labelled slots, never inside the trail data or its ordering.
3. **Never sells location or ride history.** No exact or approximate location, ride, route or contact data is shared with or sold to advertisers or partners. Sponsored challenges report only aggregate counts of completions.
4. **No advertising identifiers, no cross-app tracking** (`docs/15`).
5. **No ads in safety flows**: Help, SOS, check-in, group-ride live view, recording screen.
6. **Partners pay Myto, never riders' attention for rank.** Sponsorship is a fixed fee agreed in writing with the labelling terms; a partner that breaks them is removed.
7. **Curated means chosen by Myto**, on stated criteria (fit for touring, quality, no unsafe claims), not by who pays most.

## 6. Recommendation

| Do | When | Why |
|---|---|---|
| Implement Large Ride Pass, Myto Organiser, and the Shop link | Phase 2 (Feb-Apr 2027) after store accounts exist | They fit the principle and the policy rules |
| Validate sponsored challenges and event ticketing | Phase 3 | Hypotheses with no evidence yet |
| Defer advertising | Reassess in Phase 4 | Worst fit and value; tiny audience |
| Keep free: Explore, Ride, Fix-it, clubs, group rides to 5, joining any group ride | Always | Trust and adoption |

Honest expectation: in year one the model shows revenue far below running costs (see [financial-assumptions.md](financial-assumptions.md)). Monetisation is validated in year one, not relied on.
