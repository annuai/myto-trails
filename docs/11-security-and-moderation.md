# 11 — Security and moderation

*Not legal advice.* Indian land, forest and wildlife law varies by state and changes; the policies below are product defaults and must be reviewed by counsel and local riding/conservation experts before launch.

## 1. Threat model (summary)

| Threat | Example | Controls |
|---|---|---|
| Malicious upload | GPX with XML entity expansion (billion laughs/XXE); polyglot image; decompression bomb; oversized files | XML parser with DTD/entities off; size and pixel limits; parse in a time/memory-limited job; quarantine bucket; re-encode every image and re-write every GPX (never serve the original) |
| Account abuse | Spam submissions, fake reports, credential stuffing | Passwordless or OAuth sign-in (no passwords to stuff); rate limits per user/IP; new-account submission caps; report caps; email verification |
| Data leakage | Reading unpublished trails, other users' drafts, evidence, permission contacts | RLS in the DB plus server checks; evidence and contact fields only in moderator-scoped queries; signed, short-lived URLs for private files |
| Location harm | Publishing exact coordinates of private property, a sensitive habitat, or someone's home | Access gating; `sensitivity` levels with reduced geometry; start/end trimming; protected-area overlap flag; takedown process |
| Injection / XSS | Malicious text in names, captions, notes | Parameterised queries only; Markdown subset sanitised server-side; no raw HTML; strict CSP |
| Scraping/abuse of GPX | Bulk download of all routes | Per-IP and per-user rate limits; bot challenge on anomalies (no CAPTCHA in normal use); downloads logged |
| Insider risk | Moderator misuse | Role scoping, audit log, two-person rule for restricted/protected overlaps, MFA for privileged roles |
| Triangulating hidden trails | Repeated "near me" queries to locate a sensitive start | Distances for sensitive trails use an approximate `public_point`; query rounding; rate limits |
| Rider location exposure | Recordings expose home or movement patterns; precise coordinates in URLs or logs | Recordings private by default; start/end trimming before submit; no coordinates in URLs; location in "near me" queries not stored or logged; deletion on request |
| Device/token theft | Stolen app or Navi token reads Saved trails or submits content | Hashed, revocable, scoped device tokens; short-lived access tokens with refresh; per-device rate limits; user can revoke devices |
| Donation fraud | Fake donate pages; forged webhooks | One official donate URL, stated on the page; hosted gateway checkout; webhook signature verification and idempotency; no card data stored |
| Dependency/provider outage | Tiles, storage or auth down | Graceful degradation (list view, text route); status page notes; backups outside the primary provider |

## 2. Controls checklist
- **Transport/headers:** HTTPS only, HSTS, CSP (no inline scripts; nonce), `X-Content-Type-Options`, `Referrer-Policy`, frame protection, secure/HTTP-only/SameSite cookies.
- **Input validation:** one Zod schema per action; server rejects unknown fields; enumerations are controlled lists.
- **Uploads:** signed one-time upload URLs scoped to user and path; content-type sniffing server-side; AV scan optional (ClamAV in job) for stage 2; filenames discarded and replaced by UUIDs.
- **Authorisation tests:** automated tests assert that an anonymous user, a rider and a different rider each cannot read or modify what they shouldn't, for every table with RLS.
- **Rate limits (starting values):** sign-in 10/h/IP; upload URL 30/h/user; GPX download 60/h/IP; report 10/day/user; search 120/min/IP.
- **Secrets & ops:** secrets in environment only; least-privilege DB roles (the app role cannot alter audit tables); dependency audit and secret scanning in CI; Sentry scrubs PII.
- **Privacy (DPDP Act 2023-aligned):** collect minimum personal data; explicit consent for location use; privacy notice; user export and deletion (contributions are retained but re-attributed to "Former contributor" unless removal is requested); retention: unpublished drafts 12 months, rejected submissions 12 months, evidence files 24 months, audit logs 3 years, download logs (IP-hashed) 90 days.
- **Backups:** daily DB snapshot, weekly cross-account logical dump, versioned originals, quarterly restore drill.
- **Recording and location data (app and Navi):** continuous ride recordings are personal location data; private until the rider submits; rider can delete at any time; unsubmitted recordings retained for 12 months by default; submitted raw originals stay private; counsel to review under DPDP and GDPR-style rules because the site is globally reachable.
- **Donations:** hosted payment page for the MVP; later, webhook handler verifies the gateway signature, is idempotent, and stores only amount, currency, status, date and optional receipt email; donation records retained as required by accounting law (confirm with Myto's accountant).
- **Incident response:** documented runbook; contact address for takedown/safety reports; target 24 h to hide content on a credible landowner or authority complaint.

## 3. Moderation policy

### Principles
1. Do not publish uncertain access as fact. Unknown stays "Unknown".
2. When in doubt about sensitivity, withhold geometry and publish less.
3. A landowner or authority request to remove a trail is honoured promptly (hold first, then review).
4. Moderators record *how* they verified something, every time.

### Access classification rules
| Class | Publish? | GPX? | Display |
|---|---|---|---|
| Publicly accessible | Yes, with evidence or `rider_observed` as `community_reported` | Yes | Standard |
| Permission required | Yes, with instructions on how to obtain permission | Yes, after the permission interstitial | Prominent notice |
| Restricted access (forest/wildlife/protected/permit) | Only with second-moderator approval | Default no; moderator may enable | Prominent notice and regulations link |
| Private – no public access | **Default: do not publish.** Admin may publish a stub (no route) only if the information protects riders from trespass | No | "Do not ride" notice |
| Access unknown | May publish only as `Unverified`, with limited detail; moderator discretion | No (default) | "Access unknown. Do not assume permission." |

Protected areas, reserved forests, wildlife sanctuaries, national parks, tiger-reserve buffer zones, eco-sensitive zones and military/border areas are flagged by an overlay dataset (to be sourced and licence-checked, D-5). Overlap raises the trail to `Restricted` review automatically; the product never describes such trails as "open to everyone".

### Review checklist (per submission)
1. Automated checks green or explained (GPX, duplicates, region, overlay overlap).
2. Is the name, location and difficulty plausible? Does the route match the description?
3. Photos: relevant, no people identifiable without consent, no licence plates, no embedded personal data; credit correct.
4. Access: is the claim supported? Is a verification action needed (message owner, call range office)? Set `valid_until`.
5. Safety information adequate for the difficulty?
6. Decide: approve / request changes (field-level comments) / reject (reason code) / publish with limits.

### Reason codes (rejections)
Duplicate; insufficient information; unverifiable access claim; private property with no permission path; protected-area risk; unsafe or irresponsible content; inaccurate or corrupt GPX; copyright issue; spam.

### Reports
High priority (environmental, unsafe, landowner complaint) target 24 h; closures 48 h; other 7 days. Reporter is told the outcome. Repeated false reports lower a user's report weight (stage 2); malicious ones lead to suspension.

### Service levels (initial)
First decision on submissions within 5 days; re-reviews of resubmissions within 3 days; verification expiries handled before expiry date. Queue age and per-moderator workload are on the dashboard; a backlog above 30 pending submissions pauses new-contributor submissions caps rather than lowering review quality.

### Licensing and attribution
Contributors grant a licence to publish and redistribute the trail data, photos and GPX on the platform (exact terms: D-8). Photos keep the contributor's credit. GPX downloads include credit and source URL. Contributors confirm they are entitled to submit the content and that the route was ridden legally or with permission, and that they have not trespassed to collect it.

### Responsible-riding content (required on the platform)
Stay on marked tracks; respect gates and closures; no riding in protected areas without a valid permit; yield to people, livestock and wildlife; carry out waste; keep noise down near settlements; ride in small groups; don't trespass to "check" a route; never publish what a landowner has asked to keep private.
