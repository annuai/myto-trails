# Terms, Privacy and About Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One shared Terms, Privacy and About text rendered by both the website and the app, plus a footer line (version, myto-moto.com, "Proudly made in India") on the website footer and the bottom of the You page.

**Architecture:** The three documents are typed data in the existing `packages/domain` package (already consumed and transpiled by both apps), so there is one source and no new dependency or lockfile change. The web renders them with the existing `LegalPage` shell; the app renders them with one `legal/[doc]` screen and a `LegalFooter` component.

**Tech Stack:** TypeScript, Vitest, Next.js 16 (web), Expo Router / React Native (app).

**Spec:** `docs/superpowers/specs/2026-10-28-legal-pages-design.md`

## Global Constraints

- Every statement about data must be true of the code. Never write "we store nothing", "we never share" or similar absolutes.
- Contact address for privacy, deletion and takedown requests: `clubmyto@gmail.com` (given by the owner).
- Account deletion is by emailing the contact address; there is no deletion button (owner's decision). Do not promise one.
- Removals and takedowns "can take up to a day" to appear everywhere (matches the 24-hour cache cap in `docs/superpowers/specs/2026-10-28-web-caching-design.md`).
- Footer and You-page line: app version, a link to `https://myto-moto.com`, and the exact words "Proudly made in India".
- Terms and Privacy keep the "Draft text, pending legal review" banner (the `draft` prop of `LegalPage`) until a lawyer has reviewed them. This text is a good-faith draft, not legal advice.
- No new dependency, and no change to `package.json` or `package-lock.json`.
- Match the surrounding code's style: the web uses Tailwind tokens and `LegalPage`; the app uses `@/ui/*` components and `space`/`size` tokens, no raw colours.
- Existing web URLs `/about`, `/terms`, `/privacy` do not change.

## Calls that differ from the spec

1. The shared text lives in `packages/domain/src/legal.ts`, not a new `packages/legal`: a new workspace package would change the root `package-lock.json`, which already carries the owner's uncommitted edits.
2. The app's version comes from `Constants.expoConfig?.version` (`expo-constants` is already a dependency).
3. **`apps/mobile/app/(tabs)/you.tsx` already has the owner's uncommitted edits** (notifications wiring that depends on untracked files). Task 4 edits that file in the working tree but **must not stage or commit it**; everything else is committed. The final message tells the owner.
4. Work happens on a new branch `feat/legal-pages`, cut from the current HEAD (`feat/web-caching`), because switching to `main` would collide with the owner's uncommitted files.

## Review Focus

- No document may claim "we store nothing" or "we never share" (the exact failure the owner nearly shipped). Pinned in Task 1.
- Every document shows the contact address, and on the web it is a working `mailto:` link, so a landowner or a rider can actually reach someone. Pinned in Tasks 1 and 2.
- An unknown document name in the app (a stale deep link such as `/legal/foo`) shows a not-found message and does not crash. Pinned in Task 1 (`getLegalDoc`) and Task 4.
- The Terms takedown wording ("up to a day") and the cache cap cannot drift apart silently. Pinned in Task 1.
- A missing app version (`Constants.expoConfig` is null in some contexts) must render `v0.0.0`, never `vundefined`. Pinned in Task 1.

---

## Document text

Encode this verbatim in Task 1. Dates and wording are the owner-facing copy; `{email}` is `CONTACT_EMAIL` and renders as a link. "Updated" is `28 October 2026`.

**About** (title "About Moto Trails")
- p: Moto Trails is a community-powered directory of motorcycle trails in India. Riders share trails; moderators check them, with special care for one question: *are riders allowed here?*
- p: Moto Trails is a project by [myto-moto](https://myto-moto.com). Proudly made in India.
- *How we handle access*: ul: Every trail shows who can ride it, how we know, and when that was last checked. / We say "unknown" when we don't know. We never present uncertain access as fact. / Trails on private land or in protected areas are not published as open to everyone.
- *Contact*: p: To report a problem with a trail, use "Report an issue" on its page, or email {email}. Landowners and authorities who want a trail removed or corrected can do the same, and we hold such requests for review first.

**Terms** (title "Terms of use")
- *Using Moto Trails*: p: Moto Trails shows trails shared by riders and checked by moderators. We make no promise that any trail is open, safe or legal to ride on a given day. You are responsible for checking access and conditions and for riding within the law and your ability. Riding is at your own risk. The app does not replace emergency services.
- *What you submit*: p: You confirm that you rode or know the trail first-hand, that you did not trespass to collect it, and that you may share what you submit. You allow Moto Trails to publish your trail details, photos and GPX, to let other riders use and share them, and to credit you by display name.
- *What we may do*: p: We may edit, withhold or remove content, including at the request of landowners or authorities, and we may suspend accounts that misuse the service. A removal can take up to a day to appear everywhere, because the website and the app keep copies of trail information to stay fast.
- *Taking a trail down*: p: Landowners and authorities can ask us to remove or correct a trail by emailing {email} or using "Report an issue" on the trail's page. We hold such requests for review first.
- *Being a good member*: p: Be respectful. Do not post other people's personal details, and do not use club features to pester anyone.
- *Donations*: p: Donations go to Myto, are not a charity gift and are not tax-deductible.
- *Contact*: p: Questions about these terms: {email}.

**Privacy** (title "Privacy")
- p: Your rides stay on your phone. We keep only what the website and the community features need, and this page says exactly what that is.
- *What stays on your device*: ul: Your ride log and recorded tracks. / Your ride journal: notes, photos and voice notes. / Your to-dos and reminders. / Your documents, document photos and emergency contacts. / Backups you export, which are one encrypted file only you hold. — p: None of this is sent to us. You can erase it in the app under You, "Erase all my data". If you choose to submit a ride as a trail, that submission is sent to us (see below).
- *What we store if you sign in or join the community*: ul: Your email address and display name. / Your profile picture and bike, if you add them. / Trails you save. / Trails, photos and GPX files you submit, and the comments, questions and club posts you write. / Your club membership and join requests. / A scrambled (hashed) form of your network address and device, used only to limit abuse and keep you signed in. — p: We do not store your precise location. Location data is removed from photos you upload.
- *Phone numbers*: p: If you ask to join a club, or offer your number to another rider, the number is stored encrypted. Only the club admins you asked, or the rider you offered it to, can see it. It is deleted automatically once the request is settled or its time limit passes.
- *Your location*: p: "Near me" uses your approximate position, rounded to about 1 km, only to find trails close to you. On the website it sits in a short-lived cookie that expires after 30 minutes. We do not save it to your account or our logs. The clock in the website footer shows the time where you are; its place name comes from the approximate location your hosting provider reports for that request, or from your browser's time zone, and we do not store it.
- *Who sees what*: p: Your display name appears as credit on trails you contribute. Your email address is never shown publicly. Moderators see your submissions and the permission contacts and evidence you provide. Members of a club see each other's names, pictures and bikes.
- *Companies that help us run this*: ul: Vercel hosts the website and its service. / Supabase hosts our database. / Cloudflare R2 stores photos and GPX files. / Resend sends your sign-in email links. / A map provider supplies map tiles and sees which map area your device asks for. — p: They handle data only to provide that service. We do not sell your data or use it for advertising.
- *Cookies*: p: The website uses two functional cookies: one keeps you signed in, and one remembers "near me" for 30 minutes. There are no advertising or tracking cookies.
- *Your choices*: p: You can change your display name and sign out everywhere on your account page. You can export or erase your on-device data in the app. To delete your account and the data tied to it, email {email} and we will do it and tell you when it is done.
- *Contact*: p: Privacy questions: {email}.
- *Changes*: p: If this changes in a way that matters, we will say so here and update the date.

---

### Task 1: Shared legal text in `packages/domain`

**Files:**
- Create: `packages/domain/src/legal.ts`
- Create: `packages/domain/src/legal.test.ts`
- Modify: `packages/domain/src/index.ts` (add `export * from "./legal";`)

**Interfaces:**
- Produces, in `legal.ts`:
  - `type Part = string | { text: string; href: string }`
  - `type Block = { p: Part[] } | { ul: Part[][] }`
  - `type Section = { heading?: string; blocks: Block[] }`
  - `type LegalSlug = "about" | "terms" | "privacy"`
  - `type LegalDoc = { slug: LegalSlug; title: string; updated: string; draft: boolean; sections: Section[] }`
  - `const CONTACT_EMAIL = "clubmyto@gmail.com"`, `const MYTO_URL = "https://myto-moto.com"`, `const MADE_IN_INDIA = "Proudly made in India"`
  - `const LEGAL_SLUGS: readonly LegalSlug[]` (`about`, `terms`, `privacy`)
  - `legalDocs: Record<LegalSlug, LegalDoc>`; `draft` is `true` for terms and privacy, `false` for about.
  - `getLegalDoc(slug: string): LegalDoc | undefined`
  - `versionLabel(version?: string | null): string` returning `v<version>`, or `v0.0.0` when missing or blank.
  - `docText(doc: LegalDoc): string`: all headings and text parts joined with spaces (used by tests).
- `{email}` in the text is encoded as `{ text: CONTACT_EMAIL, href: "mailto:" + CONTACT_EMAIL }`, and the myto-moto mention as `{ text: "myto-moto", href: MYTO_URL }`.

- [ ] **Step 1: Write the failing tests** in `legal.test.ts`:
  - `"getLegalDoc finds the three documents and nothing else"`: `about`, `terms`, `privacy` return docs with matching `slug`; `getLegalDoc("foo")` and `getLegalDoc("")` are `undefined`.
  - `"every document shows the contact address as a mailto link"`: for each doc, flatten all parts; at least one part equals `{ text: CONTACT_EMAIL, href: "mailto:clubmyto@gmail.com" }`.
  - `"no document claims we store nothing or never share"`: for each doc, `docText(doc)` does not match `/we (do not|don't|never) (store|keep|collect) (any|your|anything)/i`, `/never share/i`, `/store no data/i` or `/nothing (is )?stored/i`.
  - `"terms say removals can take up to a day"`: `docText(legalDocs.terms)` contains `"can take up to a day"`.
  - `"privacy says account deletion is by email, with no button promised"`: `docText(legalDocs.privacy)` contains `"email clubmyto@gmail.com"` and `"delete your account"` and does not match `/delete (it|your account) (from|in) the app/i`.
  - `"terms and privacy are drafts, about is not"`.
  - `"versionLabel falls back instead of printing undefined"`: `versionLabel("1.2.3")` is `"v1.2.3"`; `versionLabel(undefined)`, `versionLabel(null)` and `versionLabel("  ")` are `"v0.0.0"`.
  - `"MADE_IN_INDIA is the exact owner copy"`: equals `"Proudly made in India"`; the `about` document contains it.
- [ ] **Step 2: Run to verify failure:** `cd packages/domain && npx vitest run src/legal.test.ts`. Expected: FAIL (module `./legal` not found).
- [ ] **Step 3: Implement `legal.ts`** with the types and exports above and the text from "Document text", verbatim. Add the index export.
- [ ] **Step 4: Run to verify pass:** `cd packages/domain && npx vitest run && npx tsc --noEmit`. Expected: all pass, no type errors.
- [ ] **Step 5: Commit** `feat(domain): shared Terms, Privacy and About text`

### Task 2: Website renders the shared text

**Files:**
- Create: `apps/web/src/features/legal/LegalDocument.tsx`
- Create: `apps/web/src/features/legal/LegalDocument.test.tsx`
- Modify: `apps/web/src/app/about/page.tsx`, `apps/web/src/app/terms/page.tsx`, `apps/web/src/app/privacy/page.tsx`

**Interfaces:**
- Consumes: `legalDocs`, `LegalDoc`, `Part` from `@moto-trails/domain` (Task 1); the existing `LegalPage({ title, draft, children })` in `apps/web/src/features/legal/LegalPage.tsx`.
- Produces: `LegalDocument({ slug }: { slug: LegalSlug })` rendering the document inside `LegalPage` (passing `title` and `draft`), a "Last updated {updated}" line, each section's heading as `<h2>`, `p` blocks as `<p>` and `ul` blocks as `<ul><li>`; parts with `href` render as `<a>` (external `https:` links get `className="underline underline-offset-4"` like the existing About link).

- [ ] **Step 1: Write the failing tests** in `LegalDocument.test.tsx` (follow the render style of the existing `SiteFooter.test.tsx`): `"privacy renders its headings and a mailto link"` (heading "Phone numbers" present; a link named `clubmyto@gmail.com` with `href` `mailto:clubmyto@gmail.com`); `"terms and privacy show the draft banner, about does not"` (`getByRole("note")` present for the first two, absent for about); `"about links to myto-moto.com"` (link `myto-moto` with href `https://myto-moto.com`).
- [ ] **Step 2: Run to verify failure:** `cd apps/web && npx vitest run src/features/legal`. Expected: FAIL (component missing).
- [ ] **Step 3: Implement `LegalDocument.tsx`**, and replace the body of each of the three pages with `<LegalDocument slug="…" />`, keeping each page's `metadata` export unchanged.
- [ ] **Step 4: Run to verify pass:** `cd apps/web && npx vitest run && npx tsc --noEmit`. Expected: all pass (existing web tests included).
- [ ] **Step 5: Commit** `feat(web): Terms, Privacy and About read the shared text`

### Task 3: Website footer line

**Files:**
- Modify: `apps/web/src/layout/SiteFooter.tsx`
- Modify: `apps/web/src/layout/SiteFooter.test.tsx`

**Interfaces:**
- Consumes: `MADE_IN_INDIA`, `MYTO_URL`, `versionLabel` from `@moto-trails/domain`; the web version from `apps/web/package.json` (import the JSON, which Next supports; if `tsc` rejects it, enable `resolveJsonModule` in `apps/web/tsconfig.json` and record why).

- [ ] **Step 1: Write the failing tests** (extend `SiteFooter.test.tsx`): `"footer shows the version, the myto-moto link and Proudly made in India"` (text `v0.0.0`, link `myto-moto` with `https://myto-moto.com`, text `Proudly made in India`); `"footer still links to About, Terms and Privacy"`.
- [ ] **Step 2: Run to verify failure:** `cd apps/web && npx vitest run src/layout/SiteFooter.test.tsx`. Expected: FAIL on the version and India line.
- [ ] **Step 3: Implement** in the bottom row of `SiteFooter.tsx`: keep the existing "Moto Trails is a project by myto-moto" sentence, use `MYTO_URL` for its href, and add `{MADE_IN_INDIA}` and `{versionLabel(pkg.version)}` as small muted items in the existing `text-xs text-muted` row, separated like the existing `·` separators.
- [ ] **Step 4: Run to verify pass:** `cd apps/web && npx vitest run && npx tsc --noEmit`. Expected: pass.
- [ ] **Step 5: Commit** `feat(web): footer shows version and Proudly made in India`

### Task 4: App screens and You-page footer

**Files:**
- Create: `apps/mobile/app/legal/[doc].tsx`
- Create: `apps/mobile/src/ui/LegalFooter.tsx`
- Modify (working tree only, **do not stage or commit**): `apps/mobile/app/(tabs)/you.tsx`

**Interfaces:**
- Consumes: `getLegalDoc`, `legalDocs`, `LEGAL_SLUGS`, `MADE_IN_INDIA`, `MYTO_URL`, `versionLabel`, `Part`, `Block` from `@moto-trails/domain`; `Constants` from `expo-constants`; `BackHeader`, `PageTitle`, `SectionTitle` from `@/ui/Header`; `Screen`, `Stack` (`@/ui/layout`), `Text`, `Button`; `useRouter`, `useLocalSearchParams` from `expo-router`; `Linking` from `react-native`.
- Produces: route `/legal/[doc]` (doc is `about`, `terms` or `privacy`); `LegalFooter()` showing `versionLabel(Constants.expoConfig?.version)`, a tappable `myto-moto.com` (opens `MYTO_URL` with `Linking.openURL`), `MADE_IN_INDIA`, and three links (About, Terms, Privacy) that `router.push("/legal/<slug>")`.

- [ ] **Step 1: Check what a pure test can pin.** The app's Vitest setup does not render React Native, so the rendered strings are covered by Task 1's tests (`getLegalDoc`, `versionLabel`, `MADE_IN_INDIA`). Confirm with `cd apps/mobile && npx vitest run src` that nothing else needs adding, and record that decision in one line in the commit body.
- [ ] **Step 2: Implement the screen** `app/legal/[doc].tsx`: read `doc` with `useLocalSearchParams`; `getLegalDoc(doc)`; when undefined render `BackHeader` plus `Text` "That page does not exist." and a button back, no crash. Otherwise `BackHeader`, `PageTitle` with the title and `sub` "Last updated {updated}", a short draft note for `draft` documents ("Draft text, pending legal review.", `tone="muted"`), then each section as `SectionTitle` + blocks (`p` as `Text variant="body"`, `ul` as rows prefixed with "•"), parts with `href` rendered as `Text` with `onPress={() => Linking.openURL(href)}`.
- [ ] **Step 3: Implement `LegalFooter.tsx`** as specified in Interfaces, styled with existing tokens (`Text variant="caption" tone="muted"`, `space[...]`).
- [ ] **Step 4: Edit `you.tsx`** (working tree only): import `LegalFooter` and replace the caption `Everything is stored on this device only. Myto does not replace emergency services.` with `Your rides, journal and documents stay on this device. Myto does not replace emergency services.` followed by `<LegalFooter />` inside the same bottom `View`. Do not touch the owner's other edits in that file.
- [ ] **Step 5: Verify:** `cd apps/mobile && npx tsc --noEmit && npx vitest run`. Expected: no type errors, all tests pass. If the iOS simulator tool is available, build, open You and the three documents and take a screenshot of each; otherwise say they were not viewed.
- [ ] **Step 6: Commit only `app/legal/[doc].tsx` and `src/ui/LegalFooter.tsx`:** `git add "apps/mobile/app/legal/[doc].tsx" apps/mobile/src/ui/LegalFooter.tsx` then `feat(mobile): Terms, Privacy and About screens and legal footer`. Leave `you.tsx` uncommitted and say so.

### Task 5: Verify the claims and the whole change

**Files:** none changed unless a claim is wrong.

- [ ] **Step 1: Verify the factual claims in the Privacy text against the code**, and fix the text (and its Task 1 tests) if any is wrong: cookies set by the web are only `mt_session` and `mt_near` (`grep -rn` for `cookies()` `.set(` and `Set-Cookie` under `apps/web/src`); no analytics or tracking scripts are loaded (`apps/web/src/layout`, `apps/web/src/app/layout.tsx`, `apps/mobile/package.json`); sign-in email goes through Resend (`apps/web/src/server/auth/email.ts`); the phone purge job exists (`/api/cron/purge-contact-shares`). Report each as confirmed or changed.
- [ ] **Step 2:** `npm test` and `npm run typecheck` at the repo root. Expected: all pass.
- [ ] **Step 3:** `cd apps/web && npm run build`, then start it (`next start -p 3112` with `.env.local`, Supabase-backed, no local Postgres) and fetch `/privacy`, `/terms`, `/about`; expect HTTP 200 and the text "Proudly made in India" in the footer of each.
- [ ] **Step 4:** If the Browser pane is available, open `/privacy` and the footer and take a screenshot of each of `/privacy` and the footer.
