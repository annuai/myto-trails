# 02 — Product requirements document

## 1. Vision
A trustworthy, structured, community-contributed directory of motorcycle trails in India, where every trail answers three questions before it answers "is it fun": **May I ride it? Can I ride it now? How do you know?**

## 2. Problem statement
Riders in India find trails through WhatsApp groups, Instagram reels, YouTube videos and word of mouth. The information is:
- **Unstructured** — no consistent distance, terrain, difficulty or season data.
- **Unverifiable** — "open to everyone" often means "someone rode it once". Private-estate, forest-department and protected-area restrictions are rarely stated.
- **Perishable** — monsoon washouts, landslides, gates locked, land sold. Nobody updates the post.
- **Hard to act on** — GPX files circulate as attachments with no provenance or validation.
- **At odds with responsible riding** — popular posts can push traffic into ecologically sensitive or private land.

## 3. Target users
| Group | Needs |
|---|---|
| **A. Explorers** (anonymous or registered) | Discover by place, filter by what matters, understand access before travelling, preview route, download GPX, save trails |
| **B. Contributors** (registered riders) | Submit trails with GPX/photos/access evidence, track status, respond to feedback |
| **C. Returning users** | Wishlist, revisit, be told when a saved trail changes |
| **D. Moderators/admins** | Review queue, verify access, handle reports, moderate media and GPX |

## 4. Core use cases
1. Find a trail near a given town for this weekend that is open and doesn't need a permit.
2. Compare two trails' difficulty, terrain and elevation.
3. Check whether a saved trail has since closed.
4. Download a GPX and load it in a GPS device or app.
5. Submit a trail I rode, with evidence of permission.
6. Report that a trail's gate is now locked.
7. As a moderator, approve a submission, request changes, or reject it with a reason.

## 5. Functional requirements
Priority: **M** = MVP, **S2** = stage 2, **S3** = stage 3.

### Discovery
| ID | Requirement | P |
|---|---|---|
| D-1 | Public list of published trails, no account required | M |
| D-2 | Text search over trail name, town, district, state (typo-tolerant) | M |
| D-3 | Filters: state, district, terrain, difficulty, distance, access class, operational status, GPX available, verification level | M |
| D-4 | Filters: duration, elevation gain, motorcycle suitability, season | M (suitability, season) / S2 (duration, elevation) |
| D-5 | Sort: relevance, recently added, recently verified, distance, difficulty, nearest to me (with geolocation consent) | M |
| D-6 | List view and map view; desktop split view; mobile toggle | M |
| D-7 | Filter and map-viewport state encoded in URL; shareable | M |
| D-8 | State and district landing pages, only when they have ≥ 3 published trails | M |
| D-9 | "Hide closed trails" is on by default; closed trails reachable by direct URL and a filter | M |
| D-10 | **Place search:** typing a city, town or locality (e.g. "Bangalore", also "Bengaluru") offers it as a Place; choosing it lists trails within a radius (default 150 km; 50/100/200/300 chips), nearest first, with distance shown | M |
| D-11 | **Near me:** "Use my location" (browser permission requested only on tap) shows the rider on the map and lists nearby trails; graceful fallback to place search if denied; location never stored or put in URLs | M |
| D-12 | **Approximate travel time:** each result shows estimated time to reach and return ("≈ 3 h 30 each way · round trip ≈ 7 h"), clearly labelled approximate; return leg respects trail shape (loop, out-and-back, point-to-point) | M (estimate) / S2 (real driving time via a routing provider) |
| D-13 | "Reachable within X hours" filter and a "fits in a day" view (travel + ride time) | S2 |
| D-14 | Trails with sensitive or restricted geometry use an approximate public point for all distance and travel calculations | M |

### Trail detail
| ID | Requirement | P |
|---|---|---|
| T-1 | Dedicated, indexable, shareable URL per published trail | M |
| T-2 | Above-the-fold *go/no-go* block: access class, operational status, verification level with last-verified date, difficulty, distance, duration | M |
| T-3 | Route map with accessible text alternative (waypoints list, start/end descriptions) | M |
| T-4 | Elevation profile (when elevation data exists) | M |
| T-5 | Gallery with captions and attribution | M |
| T-6 | GPX download only for published trails whose access class allows it | M |
| T-7 | Safety notes, hazards, seasonal notes, facilities (only verified facilities) | M |
| T-8 | Revision history summary ("Updated 12 Jan 2027; access re-verified 3 Feb 2027") | M |
| T-9 | Report an issue, add to wishlist | M |
| T-10 | Related trails (same region/terrain) | S2 |
| T-11 | Weather data | S3 — only if a reliable source is found |

### Access, condition, verification
| ID | Requirement | P |
|---|---|---|
| A-1 | Three independent fields: access classification, operational status, verification level | M |
| A-2 | Each access claim has evidence, verifier, verified-on and expires-on dates | M |
| A-3 | Expired verification automatically downgrades displayed verification to "Unverified – needs re-check" | M |
| A-4 | Unverified, disputed, restricted or closed states are visually and textually prominent | M |
| A-5 | Trails classified "Private – no public access" are not published with GPX or precise route; only published if the platform judges it useful and safe (default: not published) | M |
| A-6 | Responsible-riding notice shown wherever access requires permission | M |

### Accounts and wishlist
| ID | Requirement | P |
|---|---|---|
| U-1 | Sign up/in with email link or Google; no account needed to browse | M |
| U-2 | Save/unsave trails; single "Saved trails" list | M |
| U-3 | Show status-change badge on saved trails | M |
| U-4 | Email/push notification on status change | S2 |
| U-5 | Multiple collections; completed trails | S2 (data model supports it from day 1) |
| U-6 | Share wishlist by link | S2 |

### Submission
| ID | Requirement | P |
|---|---|---|
| S-1 | Multi-step form with autosaved drafts | M |
| S-2 | GPX upload with client pre-check and server validation | M |
| S-3 | Photo upload with preview, order, captions, upload progress | M |
| S-4 | Access classification with required supporting evidence (text and/or file) | M |
| S-5 | Duplicate detection against existing routes and trails | M |
| S-6 | Submission status tracking, moderator feedback, edit and resubmit | M |
| S-7 | Edit suggestions to published trails by non-owners | S2 (reports cover MVP) |

### Reporting
| ID | Requirement | P |
|---|---|---|
| R-1 | Report types: closure, wrong access class, wrong location, unsafe info, duplicate, inaccurate GPX, environmental/land-use concern, other | M |
| R-2 | Anonymous reports allowed? **No** in MVP (account required, to limit abuse); closure reports have a one-tap path | M |
| R-3 | Report triage queue; reporter notified of outcome | M |
| R-4 | Environmental concern reports escalate to priority | M |

### Moderation and administration
| ID | Requirement | P |
|---|---|---|
| M-1 | Queue of submissions, edits, reports, media flags | M |
| M-2 | Approve / request changes / reject with reason; edit in place | M |
| M-3 | Verify access; set expiry | M |
| M-4 | Moderate media and GPX | M |
| M-5 | User management (suspend, role changes) | M |
| M-6 | Audit log of all moderator actions | M |

### Donations
| ID | Requirement | P |
|---|---|---|
| N-1 | A "Donate" link in the footer and About page, and one quiet line after a GPX download; no popups, nothing blocks a download | M |
| N-2 | `/donate` page states that **Myto (the company) receives donations**, that they are not charitable or tax-deductible contributions, where the money goes (maps, hosting, moderation), and that donations never influence listings, ranking, access verification or moderation | M |
| N-3 | Hosted payment page from a payment gateway (UPI and cards); no card data on our servers | M |
| N-4 | Integrated checkout, webhook-recorded donations, receipts, recurring donations | S2 |

### Companion app and devices
| ID | Requirement | P |
|---|---|---|
| C-1 | Versioned public API (`/api/v1`), token authentication, OpenAPI description | Before companion app (not web MVP) |
| C-2 | Trails companion app (touch): records rides in the background (including while another navigation app is foreground), trims and cleans the track, adds waypoints/photos, and submits the GPX and details as a draft to Trails | Companion stage |
| C-3 | Myto Navi (Android hardware, physical controls, SIM): reads Saved trails and GPX, works offline, can record rides and submit them through the same API | Companion stage |
| C-4 | GPX downloads follow a documented export format that carries trail name, access class, last-verified date and source URL in standard GPX fields | M |
| C-5 | Manual GPX download and transfer to Navi works from release 1 with no extra build | M |

Details: [doc 14](14-platform-contract.md).

## 6. Non-functional requirements
| Area | Requirement |
|---|---|
| Accessibility | WCAG 2.2 AA; keyboard-complete; maps have list/text equivalents; status never colour-only |
| Performance | Trail page LCP ≤ 2.5 s on a mid-range Android on 4G; discovery list interactive ≤ 3 s; JS budget for map-less pages ≤ 120 KB gzip; map library lazy-loaded |
| Reliability | Reads survive map-tile or storage provider outages (list view still works); daily database backups with tested restore |
| Security | RBAC, server-side validation, upload quarantine, rate limits (doc 11) |
| Privacy | EXIF stripped from public media; precise home/start-of-ride coordinates trimmable; data export and deletion for users |
| SEO | Server-rendered trail, state and district pages; sitemap; structured data |
| Scale (planning) | 5,000 trails, 50,000 users, 500 contributions/month within the first two years. Architecture should be comfortable at 10× without redesign. *These are assumptions*, not data. |
| Localisation | English at launch; schema and strings structured so Hindi and regional languages can be added (S2+) |
| Global access | Site reachable worldwide on `moto-trails.com` via CDN-cached pages; content scope is India at launch; GDPR-style consent and DPDP both considered in the privacy design (counsel to review); units km/m |
| Brand | Presented as an independent product that is a subsidiary of myto-moto, stated in the footer, About and legal pages |
| Browser support | Last two versions of Chrome, Safari, Firefox, Edge; iOS Safari 16+ |

## 7. MVP scope
In: everything marked **M** above. The MVP is a *complete loop*: discover → decide → download → contribute → moderate → report → correct.

Explicitly **out** of the web MVP (see doc 12): offline maps, in-app navigation, reviews and star ratings, comments/social feed, contributor reputation, multi-language, integrated payments beyond the hosted donate link. Ride recording, the companion app and Navi sync are planned immediately after the web MVP (doc 12, doc 14); only manual GPX download for Navi is in the MVP.

## 8. Future scope
- **Stage 2:** collections, completed trails, update notifications, community-suggested corrections, richer elevation/gradient analysis, route comparison, contributor reputation, regional moderators, hindi.
- **Companion stage (after the web MVP, before or alongside stage 2):** public API, Trails companion app (background ride recording and submission), Navi account sync and offline packs, two-way field reports from Navi.
- **Stage 3:** route planning, GPS-device formats (FIT/Garmin Connect), riding stats, group trip planning, real-time features.

## 9. Success metrics
Targets are **proposed starting points** to be calibrated after launch; the instrumentation requirement is firm.

| Metric | Definition | Proposed target (first 6 months) |
|---|---|---|
| Discovery completion | % of discovery sessions that reach a trail detail page | ≥ 45% |
| Detail → action | % of trail-page views that result in GPX download, wishlist add or share | ≥ 12% |
| Wishlist adoption | % of registered users with ≥ 1 saved trail within 7 days of signup | ≥ 40% |
| Valid submission rate | Submissions that pass automated GPX/media validation on first upload | ≥ 70% |
| Approval yield | Submissions eventually published ÷ submissions received | ≥ 50% (a very high rate would suggest weak moderation) |
| Moderation turnaround | Median time from submission to first moderator decision | ≤ 5 days; p90 ≤ 10 days |
| Closure-report turnaround | Median time from closure report to status reflected | ≤ 48 h |
| **Access-information accuracy** | Of a monthly random sample of published trails, % where a moderator's spot-check confirms the displayed access class and status | ≥ 95% |
| **Verification freshness** | % of published trails with an unexpired access verification | ≥ 80% |
| Report resolution | % of reports resolved within 7 days | ≥ 90% |
| Data completeness | % of published trails with distance, difficulty, terrain, ≥ 3 photos, and a GPX | ≥ 75% |
| Performance | p75 LCP on trail pages (field data) | ≤ 2.5 s |
| Trust signal (qualitative) | In-product "was this accurate?" after a GPX download, and survey | tracked, no target |

A deliberately-absent metric: total trail count as a headline success measure.

## 10. Constraints and assumptions
**Constraints**
- Documentation-only phase; existing site untouched.
- Must feel like Myto and reuse its brand tokens.
- Small team: architecture favours managed services and few moving parts.
- Legal: India-specific land-use, forest and wildlife rules; DPDP Act 2023 for personal data. *Not legal advice; a lawyer should review the terms, disclaimers and takedown process before launch.*

**Assumptions (to confirm)**
1. A small moderation team (2–4 people, part-time) exists or will exist; Club Myto members can seed moderators.
2. Launch will start with a curated set (target 30–60 verified trails across 3–5 states), then open submissions.
3. Contributors will mostly ride dirt/gravel/forest/hill trails, not highway touring routes.
4. Initial audience is English-reading riders; mobile web is the dominant device.
5. No monetisation in the MVP other than a donate link; donations go to Myto, the company (confirmed).
6. Trail data is licensed to the platform by contributors under a clear licence (decision D-8).
