# 01 — Existing system audit

**Audit date:** 2026-10-24. **Method:** read-only HTTP requests against the public site (HTML, response headers, the single compiled CSS bundle, `robots.txt`, `sitemap.xml`, route status probes) and a rendered-text read of the homepage.

**Important limitation:** the working folder (`/Users/annuaip/Downloads/mototrails`) is empty and no repository for myto-moto.com was provided. Everything below about the *source code* is inferred from the production output. Anything about the backend is unknown unless listed under "Verified".

## Verified (observed directly)

### Stack and hosting
| Item | Evidence |
|---|---|
| Framework: **Next.js, App Router**, bundled with **Turbopack** | `/_next/static/chunks/turbopack-*.js`, `x-nextjs-prerender`, `vary: rsc, next-router-state-tree…`, `/_next/image` URLs |
| Host: **Vercel**, Mumbai edge (`bom1`) | `server: Vercel`, `x-vercel-id: bom1::…` |
| Homepage is statically prerendered, ISR/edge cached | `x-nextjs-prerender: 1`, `x-vercel-cache: HIT`, `cache-control: public, max-age=0, must-revalidate` |
| Canonical host mismatch | `www.myto-moto.com` serves the site, but `sitemap.xml` and `robots.txt` reference `https://myto-moto.com` (no `www`). Redirect behaviour not checked. |
| Routes that exist | `/shop`, `/journal`, `/club`, `/about`, `/support`, `/account/login` (all HTTP 200) |
| Routes that do not exist | `/api/health`, `/trails` (404) |
| `robots.txt` disallows | `/admin/`, `/account/`, `/api/`, `/auth/`, `/checkout`, `/order-success/` — implies an admin area, accounts, an API and a checkout exist |

### Design system (from the compiled CSS)
- **CSS architecture:** Tailwind CSS v4 (`@theme` variables such as `--color-*`, `--text-*`, `--radius-*`, `--font-*`, `--spacing: .25rem`).
- **Typefaces:** **Michroma** (`--font-display`, wide technical display face) and **Geist** (`--font-sans`, variable 100–900), both self-hosted via `next/font`; system monospace for `--font-mono`.
- **Colour tokens**

| Token | Value | Role |
|---|---|---|
| `--color-background` | `#f2ede8` | Warm off-white page |
| `--color-surface` | `#f2f0ec` | Surface |
| `--color-foreground` | `#1a1a1a` | Text |
| `--color-muted` | `#6b6560` | Secondary text |
| `--color-border` | `#00000014` | 8% black hairline |
| `--color-accent` / `--color-card-accent` | `#be3a23` | Brand red |
| `--color-card-dark` | `#1c1c1a` | Dark card |
| `--color-card-{clay,cream,olive,sand,stone,warmgrey}` | `#ddd4c8 #ede8de #d8dbc9 #ddd7ca #e3ddd4 #e1e1dc` | Muted earth card fills |

- **Radii:** `16px / 24px / 32px` plus Tailwind `1rem / 1.5rem`. Class usage on the homepage: `rounded-3xl` ×22, `rounded-2xl` ×11, `rounded-xl` ×10, `rounded-full` ×2.
- **Type usage:** 22 `uppercase` and 13 `tracking-widest` occurrences on the homepage (small uppercase eyebrow labels). Tight tracking (`-0.025em`) on headings.
- **Motion:** default transition `.15s cubic-bezier(.4,0,.2,1)`; durations of `.2s / .3s / .5s` used.
- **Shadows:** Tailwind default large shadow exists in the bundle; usage not quantified.

### Content structure (homepage, rendered text)
Primary nav: Products (`/shop`), Journal, Club, About, Support; search (⌘K) and Sign in. Sections: hero ("Designed for the roads that don't end."), three products (Trail Beam, Trail Kit, Navi), six "why" blocks, ecosystem, five-step process, journal, community (Club Myto via WhatsApp), newsletter. Footer: logo, location (Kerala), live IST clock, link columns, Instagram/YouTube, "All products are open source".

### Third-party scripts
The homepage HTML contained no references to Shopify, Stripe, Razorpay, Supabase, Clerk, NextAuth, Firebase, Google Tag Manager or Vercel Insights. This means none are in the **initial HTML**; they may still load later or on other routes.

## Not verified (assumptions — do not rely on these)

| Question | Why it matters | How to resolve |
|---|---|---|
| What powers `/account/login` and the `/shop` checkout (own backend, a commerce platform, an auth library)? | Decides whether Myto Trails can share sign-in | Access to the repo, or the Vercel project's environment variable names |
| Is there a database? Which one? | Reuse vs. separate data store | Repo / Vercel integrations |
| Does the site expose an API (`/api/*` is disallowed in robots)? | Navi integration (companion stage) | Repo |
| Is the Navi product backed by any web service or data format? | Stage-3 integration | Myto team |
| Is there a component library (shadcn/Radix etc.) or only hand-written components? | Reuse strategy | Repo; the bundle suggests utility-first hand-written styling but that is not conclusive |
| Is the repository public ("All products are open source" refers to products, not necessarily the site)? | Whether source can be inspected | Myto team |
| Does `myto-moto.com` ↔ `www` redirect and which is canonical? | Subdomain and cookie-domain design | Test, then decide |
| Are there dark-mode tokens or only a light theme? | Token inheritance | Repo; none observed in the CSS bundle |
| Analytics and consent tooling | Privacy posture for a user-contribution product | Repo |

## Opportunities for reuse

1. **Tokens.** Colours, typefaces and the Tailwind v4 `@theme` structure can be lifted into a shared `@myto/tokens` CSS file consumed by both apps. This is the main, low-risk reuse.
2. **Platform and skills.** Same Vercel team, same Next.js version, same deployment practice. Zero new operational learning for the Myto team.
3. **Header/footer pattern.** The nav shape (logo, five links, ⌘K search, sign-in) and the footer (tagline, location, IST clock) are small enough to re-implement identically, then extract into a shared package when a third consumer appears.
4. **Brand assets.** `myto-logo.svg`, photography direction (motorcycle in landscape), product imagery.
5. **Content cross-links.** Journal articles (Engineering, Craft, Research) can link to trails and vice-versa; Club Myto (WhatsApp) is a ready moderation and verification audience.

## Technical constraints

- Next.js on Vercel is the deployment baseline. Anything that does not fit serverless (long-running GPX processing, heavy image work) must run as a background job or small external worker.
- Tailwind v4 is CSS-first; tokens live in CSS, not a JS config. Design-token tooling should target that.
- The site is mostly static/ISR; Myto Trails is dynamic (user data, search, uploads). It should be a separate deployable so the shop's reliability is not coupled to trail traffic or user-generated content.
- `/account/*` is disallowed for crawlers and likely holds user data. Whatever the existing account system is, Myto Trails must not read from it without an explicit integration decision.

## Differences between the existing site and the brief

The brief asks Myto Trails to avoid oversized rounded cards and excessive uppercase labels. The live site uses both heavily (`rounded-3xl`, uppercase tracking-widest eyebrows). Those are expressions of the **marketing** site, not its token foundation. The recommendation (docs 08/09) is to inherit colours, type families, spacing and the hairline border treatment, and to deliberately use tighter radii and sentence-case labels for this information-dense product. This is a divergence the Myto team should consciously approve (decision D-3 in doc 13).

## Potential risks

| Risk | Note |
|---|---|
| Hidden coupling to the shop | Resolved by decision: Trails is an independent site on `moto-trails.com`, so cookies are not shared and Trails has its own accounts. "Sign in with Myto" remains a later option if the shop's auth supports it. |
| SEO | An independent domain starts with no authority from myto-moto.com. Mitigated by cross-links, the subsidiary statement, defensive redirect domains and a single canonical host config (doc 05 §1). |
| Brand drift | Without a shared token package the two sites will diverge. |
| Unknowns above | The largest planning risk is the auth/data unknowns; the proposed architecture is deliberately independent of them. |
