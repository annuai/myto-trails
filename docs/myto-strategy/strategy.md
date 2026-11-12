# Myto strategy (Nov 2026 to Oct 2027)

Status of this document: draft for the owner, written 2026-11-12. Every number lives in [model.mjs](model.mjs) and is a planning assumption, not a forecast. Nothing here is traction: **Myto is on no app store, has no paid Apple account, and billing is not live.**

Related: [product-roadmap.md](product-roadmap.md) · [monetisation-model.md](monetisation-model.md) · [financial-assumptions.md](financial-assumptions.md) · [image-requests.md](image-requests.md) · [presentation/](presentation/README.md)

## 1. Vision

> Enjoy the ride. Explore more. Share the journey.

Myto is an India-first ecosystem for motorcycle touring and adventure riders. It celebrates **exploration, not speed**: the reward is the place you reached and the people you rode with, never a lap time. Four parts, one rider:

| Part | What the rider gets | Status (2026-11-12) |
|---|---|---|
| **Explore** | A trusted trails database: may I ride it, can I ride it now, how do we know. GPX, route planning, offline maps | Built |
| **Ride** | Record rides, journal, fuel log, Year-in-rides recap, group rides with live status | Built (Marks local; group ride cap is 100 until a purchase path exists) |
| **Equip** | Fix-it guides, checklists, the Myto Shop (physical goods, external store `shop.myto-moto.com`), Myto Originals plus curated third-party | Fix-it built; Shop discovery layer **in build**, not verified |
| **Connect** | Clubs, group rides, rider contributions with moderation, achievements and Trailmarks | Clubs and group rides built; achievements, challenges, contribution/moderation mapping **in build**, not verified |

It is a lifestyle brand with a useful product, not a social network: riders contribute trails, conditions and photos, they do not follow, like or rank each other (see `docs/15`, "deliberately not in the first release").

## 2. Audience

Primary: touring and adventure riders in India who plan weekend and multi-day rides on 250 to 500 cc and larger bikes, ride in groups, and today stitch together a maps app, a chat group and spreadsheets. Secondary: club road captains and ride organisers (the buyers of group-ride capacity); trail contributors (the supply side). Participants in a group ride **never pay**.

What we do not claim: market size, rider counts, or willingness to pay. None is measured. The first job of the year is to measure them (see roadmap, Foundation).

## 3. Positioning and competitors

Evidence base: [docs/competitive](../competitive/2026-11-01-ridingverse-analysis.md) (one competitor, researched 2026-11-01 from public pages; app itself not opened). From that note, and only that:

- Riding Verse is an Indian riding community app; it is group-ride and community led. Its trails and hazard pins have no moderation story we could find; paid rides run off-app via UPI QR.
- Our difference is **trust in trail access and condition** (evidence, expiry, moderation), local-first recording that works without a network, and private-by-default location.
- We have gaps they cover (ride events with RSVP/QR check-in, split expenses). See the gap matrix in that note.

No superiority claim is made beyond what that note supports. Other competitors have not been analysed; do that before any external pitch.

## 4. Principles that bound monetisation

1. Safety, trail condition, verification and rankings are never for sale or influenced by commerce.
2. Never sell location or ride history. No advertising identifiers (`docs/15` §analytics).
3. Participants never pay; organisers pay for capacity.
4. Free-tier infrastructure (Vercel Hobby, Supabase free, R2): features must cost nothing to run until revenue exists.
5. Everything commercial is labelled in the product: Sponsored, Partner, Affiliate, Myto Original.
6. Limits and prices are configuration (entitlement table), not code.

Conflict to resolve with the owner: `docs/15` lists "selling or advertising to riders" as not in the first release, and `docs/12` lists payments as a non-goal for the web MVP. Both were first-release scoping. This strategy proposes introducing the Shop link and group-ride capacity pricing; advertising stays deferred (see monetisation-model).

## 5. Where we are (audited from the repo, 2026-11-12)

Real and in the repo: trails database with moderation and GPX; ride recording and journal; group rides with live status, Help, quick signals; clubs and club feed; route planning; fuel log and costs; Year-in-rides recap; Marks (on device); Fix-it guides (content in Supabase and R2; 15 of 18 illustrations uploaded, 3 and a mechanic review pending); document and service reminders; offline maps. Group-ride capacity enforcement, the entitlements table and the organiser upgrade prompt are built and unit-tested; the free cap is still 100 because there is no purchase path, and switching to 5 is a configuration change.

In build by other agents, not verified: Shop discovery layer, achievements/Trailmarks/challenges, contribution and moderation mapping.

Not built: billing, accounts on a store, push (needs a paid Apple account, parked in `docs/todo.md`), sync, garage, community heat map.

Sources for this section: `docs/todo.md`, `PRODUCT.md`, `apps/mobile/README.md`, `docs/16 §13`, `apps/mobile/assets/fixit/README.md`, git log on `feat/myto-monetisation`. The README note that "clubs are sample data" may predate the club feed; confirm before stating club numbers.

## 6. Go-to-market

### 6.1 Region: where to start

Evidence in the repo:

- The four approved (non-sample) trails in `apps/web/data/trails` are all in Karnataka and all in or beside Bengaluru: Hesaraghatta (Bengaluru Urban), Manchanabele Dam (Bengaluru South, about 37 km route), Bettahalasuru and Thippagondanahalli (Bengaluru Urban).
- The six sample trails (3 Kerala, 2 Meghalaya, 1 Karnataka) are flagged `sample` and are not coverage.
- Every real in-app capture and test ride in the repo (Manchanabele navigation, a Nandi Hills group ride, Bengaluru map) is local to Bengaluru.
- The product principle is "coverage is never claimed beyond what the data shows" (`PRODUCT.md`).

**Recommendation: launch as Bengaluru and the weekend-ride radius (roughly 200 km: Nandi Hills, Magadi, Mysuru road, Chikkamagaluru and Coorg side) in Karnataka; other states stay "coming soon".** Reason: it is where we have verified trails, where the team can ride and verify in person, and moderation needs local knowledge. Limits of this evidence: it reflects where the team has worked, not where demand is. The live Supabase trail and club counts were not queried for this document; check them before the first outreach and update this section. Test demand with the founding cohort before opening a second state.

### 6.2 Founding contributors (50 to 100)

Goal: 50 to 100 named contributors who each have submitted or verified at least one trail, condition report or photo, giving the directory real coverage before public launch.

| Step | What | Metric |
|---|---|---|
| 1 | Personal invites to riders and club road captains the team knows in Bengaluru; no cold ads | 150 invites sent (assumption), 50 to 100 accepted |
| 2 | Contributor credit on each trail (already supported: `contributorCredit`), a Founding Contributor mark in the profile | Share of contributors with 1+ approved item |
| 3 | A small monthly "ride and verify" day with a club: ride three trails, log conditions, photograph | Approved items per ride day |
| 4 | Moderation by 2 to 4 part-time moderators drawn from this cohort (`docs/02` assumption) | Median days to moderate (target in `PRODUCT.md`: 5) |
| 5 | Rewards are recognition and gear from the Shop where margin allows, never cash for contributions (avoids paying for volume over accuracy) | n/a |

Gate to public launch: founding cohort and coverage thresholds set by the owner; suggested start point is 30+ approved trails in the launch radius (an assumption, not a measurement).

### 6.3 Content formats

Field-guide editorial, in the existing visual direction (`docs/08`, "Survey sheet"): the trail of the month (photo plate, mono caption, access status), ride report with GPX, "Fix it" short guides, Year-in-rides cards for sharing, and the contributor spotlight. Short video clips are not started (`docs/todo.md`). No celebrity or speed content; no ranking of riders.

### 6.4 Partners (hypotheses, none contracted)

| Partner type | Why | What they would get | Risk |
|---|---|---|---|
| Riding clubs | Group-ride demand, trail verification | Club tools free; organiser capacity paid | Clubs expect everything free; keep core free |
| Gear and accessory brands (curated, third party) | Shop breadth without stock | Affiliate listing, labelled | Must not influence trail content |
| Tour operators and homestays on routes | Real trip planning value | Labelled partner listing near a route | Must not influence access or condition |
| Local mechanics and parts sellers | Fix-it companion | Directory listing (needs data we do not have) | Data effort |
| Moto media and creators | Reach | Content collaboration | Do not buy reach before the product is on a store |

## 7. Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| No store release yet | All store revenue is zero until a paid Apple account and review exist | Make this the Foundation gate; Android first is an option (APK exists, not a store build) |
| Revenue small against even modest opex | The model shows product revenue alone does not cover costs in year one (see financial-assumptions) | Stay free-tier and founder-funded; treat year one as validation |
| Commerce erodes trust | The moat is trust in access and condition | Hard separation rules (monetisation-model §Advertising) |
| Store policy | Digital unlocks must use platform billing, with a fee | Plan on the 15% tier; see sources |
| Contributor supply | Directory is thin outside Bengaluru | Region discipline, founding cohort |
| Moderation load | Free-tier, part-time team | Evidence and expiry model; cap submissions per contributor |
| In-build features not verified | Deck would overclaim | Status labels on every slide |

## 8. Owner decisions needed

1. Android first on Google Play (no paid Apple account) or wait for Apple? Billing for either needs the corresponding account.
2. Switch the group-ride free cap to 5 only when a purchase path exists (current plan) or earlier with a waitlist?
3. Confirm Bengaluru-radius launch region once live trail counts are checked.
4. Whether Shop revenue sits in the same entity and books as the app (affects GST and reporting).
5. Revisit the `docs/15` "no advertising" line only if advertising moves out of Defer.
