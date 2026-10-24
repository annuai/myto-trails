# 13 — Risks and open decisions

## 1. Risk register
Likelihood (L) and impact (I): Low / Medium / High. Owner suggestions are placeholders.

| # | Risk | L | I | Mitigation | Early signal |
|---|---|---|---|---|---|
| R1 | **Incorrect access information** leads a rider into a locked, private or prohibited area | M | High | Evidence-based assessments; verification expiry; "Unverified" default; closure reports with immediate visible warning; disclaimers; monthly accuracy audit | Reports of wrong access; failing audit sample |
| R2 | **Private property and permissions:** landowners object, trespass incidents | M | High | Default no-publish for private/no-access; permission instructions; takedown within 24 h; hold-first policy; contributor attestation | Landowner complaint |
| R3 | **Restricted/ecologically sensitive areas** (reserved forests, sanctuaries, buffer zones) are publicised | M | High | Protected-area overlay flag; Restricted needs two-person approval; reduced-geometry publication; environmental reports top priority; engage conservation advisers | Overlay overlap in submissions |
| R4 | **GPX inaccuracy** (drift, elevation error, wrong track) | H | Medium | Validation and outlier detection; DEM-smoothed elevation; "approximate" wording; user feedback after download; accuracy reports | Reports tagged inaccurate GPX |
| R5 | **User-submitted content quality / harmful content** (spam, unsafe advice, copyrighted photos) | H | Medium | Moderation before publish; licence attestation; report tools; reason codes; rate limits | Rejection rate; spam attempts |
| R6 | **Moderation workload** exceeds capacity, causing backlog and stale data | H | High | Automated checks; submission caps; queue metrics; regional moderators in stage 2; verification expiry sweeps scaled to capacity; curated launch | Queue age above SLA |
| R7 | **Mapping costs** grow with traffic | M | Medium | Lazy-load map; list-first; cache tiles via provider config; budget alerts; PMTiles self-hosting path | Tile request growth vs. budget |
| R8 | **Storage and egress costs** (photos, GPX) | M | Medium | Fixed variant set, AVIF/WebP, caps per trail; CDN; R2 migration path | Storage/egress bill |
| R9 | **Data quality and coverage gaps**; thin pages hurt SEO and trust | H | Medium | Curated seed; indexability thresholds; completeness metric; no coverage claims | Completeness < target |
| R10 | **Third-party dependency failure or policy change** (tiles, auth, storage, email) | M | Medium | Provider abstractions; graceful degradation; backups; contract/pricing review | Outage, pricing notice |
| R11 | **Long-term maintenance** — small team, no owner after launch | M | High | Simple stack; runbooks; ADRs; documented component architecture; named owner per area | Rising bug age |
| R12 | **Legal exposure** (liability for injury, defamation, takedowns, DPDP compliance) | M | High | Counsel review; terms and disclaimers; clear takedown path; privacy notice; data minimisation | Legal notice |
| R13 | **Privacy of contributors** (home location in GPX, EXIF GPS, identifiable photos) | M | High | Start/end trimming option; EXIF stripped; face/plate guidance; private evidence | Privacy complaint |
| R14 | **Security incident** via uploads or auth | L | High | Doc 11 controls; security review in M7 | Anomalous uploads |
| R15 | **Brand divergence** from myto-moto.com | M | Low | Shared tokens; design review checkpoint | Visual drift |
| R16 | **New independent domain starts with no search authority; product name "Moto Trails" vs parent brand "Myto" may confuse some visitors** | M | Medium | Cross-links from myto-moto.com and the Journal; optional redirect domains; "subsidiary of myto-moto" statement; quality unique pages; canonical host config allows later migration | Low indexing; branded-search misses |
| R17 | **Over-scoping the MVP** | H | High | Explicit non-goals; stage gates | Milestone creep |
| R18 | **Cold start:** too few trails or contributors at launch | H | High | Curated seed; Club Myto outreach; targeted regions first | Low submission count |
| R19 | **Background recording unreliable on budget Android phones** (battery killers) or rejected by store review | H | High | Foreground service, crash-safe incremental writes, in-app guidance, early spike on real devices before framework choice, store policy dry run | Spike loses points; review rejection |
| R20 | **Brand/policy conflict** between "without limits" (Navi) and responsible riding (Trails) leads to restricted trails promoted as open | M | High | D-16 display rule; shared access data; copy review | Marketing drafts |
| R21 | **Donation legal/tax issues** (GST, overseas payments, wording implying charity) | M | Medium | Accountant review; plain statement that Myto the company receives funds; no tax-deductibility claims | Gateway or accountant objections |
| R22 | **Free-tier operation in production** (paused database, no backups) | M | High | Free tiers for development/staging only; paid plans from beta; weekly cross-account dump | Project paused alert |
| R23 | **Navi cannot read the GPX export** or has unexpected limits | M | Medium | Plain GPX 1.1 subset; acceptance test on a real unit; adapt exporter | Failed device test |
| R24 | **Location data of riders** (recordings, near-me) mishandled | M | High | Private by default, trimming, no coordinates in URLs/logs, deletion, counsel review | Privacy complaint |

## 2. Open decisions requiring approval

| ID | Decision | Recommendation | Alternatives |
|---|---|---|---|
| D-1 | Placement and domain | **Decided:** independent site on `moto-trails.com`; `trails.myto-moto.com` and `www` redirect (301) to it (`mytotrails.com` and `myto-trails.com` optional); footer, About and legal pages state that Moto Trails is a subsidiary of myto-moto. Ownership of the domain(s) still to be confirmed | Subdomain `trails.myto-moto.com`; path `myto-moto.com/trails` via multi-zone |
| D-2 | Launch geography | Start with 3–5 states where the Myto team has local knowledge | National launch |
| D-3 | Brand divergence: tighter radii, sentence-case labels, new accent | Approve Direction A as specified | Match the marketing site's rounded/uppercase style exactly |
| D-4 | Authentication | Separate Trails accounts (email link + Google) now (an independent domain cannot share cookies with myto-moto.com anyway); "Sign in with Myto" later if the shop's auth supports it | Shared accounts from launch (requires auth discovery) |
| D-5 | Protected-area and boundary datasets | Source open datasets, check licences, and consult a conservation adviser on overlay rules | Skip overlay in MVP (not recommended) |
| D-6 | Vendors and budget: Supabase (DB and auth), **Cloudflare R2 (media and GPX; added before beta, development uses Supabase Storage)**, tile provider, job runner, email, Vercel plan | Supabase free tier for development and staging only; **paid plans (Supabase Pro from $25/month, a commercial Vercel plan) from beta**, because the free tier pauses after a week idle and has no backups (checked 2026-10-24). Verify India region, Vercel commercial terms and all prices before M0 exit | Neon + Auth.js + R2 (close second); self-managed Postgres |
| D-7 | Contributor model at launch | Invite-only beta, then open registration with new-user submission caps | Open from day one |
| D-8 | Content licence and attribution terms for contributed data/photos | Non-exclusive licence to Myto to publish and redistribute on the platform **and in Myto products such as Navi, including offline copies**; credit retained; GPX downloads attributed. Settle before launch | Open licence (e.g. CC BY-SA) — affects reuse and ODbL interplay; needs legal input |
| D-9 | MFA for moderators/admins | Required | Optional |
| D-10 | Team and capacity: who builds, who moderates, who owns data quality | Needs input | — |
| D-11 | Default for "Private – no public access" trails | Do not publish | Publish stub with "Do not ride" notice |
| D-12 | Downloads: interstitial acknowledging permission/responsible riding before first GPX download | Yes | No interstitial |
| D-13 | Language at launch | English only | English + Hindi |
| D-14 | Name | **Decided:** the product is called "Moto Trails" (matches the logo and `moto-trails.com`); the parent brand stays "Myto" and is named in the footer subsidiary statement | "Myto Trails" |
| D-15 | Donations | **Decided:** "Donate" button; Myto (the company) receives funds; page says donations are not charitable or tax-deductible and never influence listings or moderation; hosted payment page for MVP. Open: GST treatment, overseas payments, gateway choice (accountant) | Integrated checkout from day one |
| D-16 | Brand alignment between Trails (responsible riding, verified access) and Navi ("without limits") | Navi always shows access class, condition and verification date for Trails content; Trails never labels restricted/private trails open; no "without limits" messaging for Trails content | Looser coupling with no display rule |
| D-17 | Companion stage sequencing | Web MVP first (API-ready), then public API (M9), recording spike and Trails app (M10), Navi integration (M11) | Build the app in parallel with the web MVP (needs more team capacity) |
| D-18 | Place search data and travel time | Own gazetteer from an open dataset (licence check) for place search; approximate straight-line-based travel time in release 1, real routing later | Paid geocoding API; routing from day one |
| D-19 | Trails app framework | Decide after the background-recording spike on real budget Android phones (React Native/Expo candidate for code sharing) | Flutter or fully native |

## 3. Unresolved questions (need facts, not decisions)
1. What authentication and data systems does myto-moto.com use? Is the repo accessible? (doc 01)
2. Does Myto Navi use or plan a GPX/route format or API that should influence the schema now?
3. Who are the first moderators and how many hours per week are available?
4. Is there an existing set of trails (Club Myto, WhatsApp, Journal) to seed, with contributor consent?
5. Are there official or semi-official sources (forest departments, state tourism, adventure associations) to partner with for access verification?
6. What is the budget envelope for hosting, maps and moderation tooling?
7. Which states have specific off-road/motor vehicle rules that the access taxonomy must reflect (needs local legal input)?
8. Is a landowner-facing process needed (e.g. a way for owners to claim a trail and set access)? Suggested for stage 2.
9. What analytics and consent tooling does Myto currently use, and should the product follow it?
10. Does the Myto brand allow the survey-blue accent and the tighter radii, and who signs off?
11. Do you own `moto-trails.com`, and and do you want `mytotrails.com` and `myto-trails.com` as optional redirects?
12. Which GPX features and file-size limits does Navi's viewer support? Can the Trails project test on a Navi unit?
13. Who owns the Navi-side integration work?
14. Which payment gateway will Myto use for donations, and does it support UPI and international cards?
15. Does Supabase offer a region close to India, and what do Vercel's commercial terms require? (not verified)
16. Which open place dataset (and licence) will seed the gazetteer?

## 4. M1 implementation deviations from the data model (doc 06)
- `trail.id` (a never-reused UUID) is the stable public id; there is no separate `public_id` column.
- `contributor_credit` (text) replaces `author_id` until accounts exist (M3).
- `route`, `gpx_file`, `place`, `device`, `donation` and `submission` tables arrive in later milestones; `trail_slug_history` (permanent redirects on rename) is deferred to M6.
- `verified_at`, `valid_until` and `expected_until` are `date` columns; a date means "valid through the end of that UTC day".
- Public reads go through `public_*` views under the `anon` role (ADR 0004). Sample trails (`is_sample`) exist only for development and are excluded from the production sitemap and from indexing.
