# Terms, Privacy and About: one shared document, plus footer and You-page links — design

## Why

The website has draft Terms, Privacy and About pages. The mobile app has none, and its You page says "Everything is stored on this device only", which is wrong once someone signs in. The owner wants short, readable, honest legal pages written once and used by both the app and the website, with a consistent footer line.

## Decisions (the owner's)

- Terms, Privacy and About, **one source of text** reused by the website and the app.
- Concise and easy to read; add extra content only where something needs explaining.
- Privacy stance: the brand is pro-privacy; personal tracking data stays on the device.
- **Trail removal can take up to a day** and the Terms say so.
- Footer of the website and the bottom of the You page show: **app version, a link to myto-moto.com, "Proudly made in India"**, plus links to Terms, Privacy and About.
- The owner confirmed the honest framing below (not "we store nothing").

## What is true today (checked in the database migrations)

**Only on the device:** ride log, journal, to-dos, documents, emergency contacts, notification reminders. Backups are an encrypted file the person keeps.
**On the server, only when the person signs in or uses community features:** email, display name, avatar, bike, saved trails, comments, club posts and join requests, submitted trails with photos and GPX, phone numbers for join requests and rider questions (stored encrypted, kept only until the request is settled, then deleted), a hashed network address and hashed device identifier (abuse limits and sessions), and moderation and audit records.
Location: "near me" position stays in the browser or app and in a short-lived cookie; it is not stored in the account or logs. Photo location data is removed from uploads.

## Verified against the code

- Phone numbers: a scheduled job (`/api/cron/purge-contact-shares`) wipes expired ones, so "kept only until the request is settled" is true.
- Photos: EXIF and GPS tags are removed from every uploaded image variant.
- Sign out and "sign out everywhere", changing the display name: exist on the web account page.
- On-device export and erase: exist in the app (You page).
- **Account deletion does not exist** in the web or the app. The current web Privacy text says people can "ask" for deletion. Until a deletion feature exists, the Privacy text must say deletion is by emailing the contact address and must not promise a button. See "Open for the owner".

## Design

### Where the text lives
The existing web pages at `/about`, `/terms` and `/privacy` are the starting text and keep their URLs. A new workspace package, `packages/legal` (my call), source-only like `packages/domain` (which the web already transpiles), exporting the three documents as typed data: a title, an effective date, and a list of sections, each a heading with paragraphs and/or bullet items (plain strings; links allowed in a small, defined form). No markdown library is needed on either side: the web renders it with `LegalPage` styling and the app with its existing text components. This keeps one source and avoids adding a dependency to the app.

### Content
- **About.** What Moto Trails is, how access is handled and the contact path (keep the existing meaning of the current page).
- **Privacy.** In plain language, in this order: *What stays on your device* · *What we store if you sign in or join the community* · *Phone numbers* (stored encrypted and removed once the request is done) · *Your location* · *Who sees what* · *Third parties we rely on* (hosting, database and file storage providers, and email delivery for sign-in links, by category, named only after the builder confirms the actual providers from the code and environment) · *Your choices* (change name, sign out everywhere, delete your account and what that removes, export and erase on-device data in the app) · *Contact*.
- **Terms.** Keep the existing points (no promise a trail is open, safe or legal; what you submit and the licence you grant; moderation and removal; donations) and add: **removals and takedowns may take up to a day to appear everywhere** because the site and app keep copies for speed; riding is at your own risk; the app does not replace emergency services; accounts may be suspended for misuse.
- Plain English at roughly a reading-age a teenager can follow; short sentences; no legal boilerplate that the product does not need.
- The existing "draft, pending legal review" banner stays until the owner has had the text reviewed by a lawyer. The text is a good-faith draft, not legal advice.

### Footer line (web) and bottom of You page (app)
One line group: `v<version>` · link to myto-moto.com · "Proudly made in India" · links to Terms, Privacy, About. The web footer already has Privacy and Terms links and the myto-moto link; extend it rather than duplicate. In the app, add this block at the bottom of the You screen, replacing the inaccurate "Everything is stored on this device only" caption with a correct one (for example, "Your rides, journal and documents stay on this device."); the "does not replace emergency services" sentence stays.
The app has `expo-constants` for its version; the web footer shows the web build's package version (my call). Both currently read `0.0.0` and the version is always rendered (my call); setting a real version, such as `0.1.0`, is a one-line change outside this work. Each document shows its effective date, the date it is published (my call).
Takedown wording is backed by the caching design: `/api/v1` responses stay cached at most 24 hours, so "up to a day" is true as long as that cap holds.

### App screens
Three routes in the app (Terms, Privacy, About) that render the shared document. The links open them in-app; the myto-moto.com link opens the browser.

## Goals
- One text, two surfaces, no drift.
- Everything stated about data is true of the code.
- Reads quickly on a phone.

## Non-goals
- No cookie banner or consent flow (the site sets only functional cookies; the builder must confirm this from the code before the Privacy text says so).
- No translations in this change.
- No analytics or tracking is added.

## Anti-goals
- Any claim in the text that the product does not do (especially "we store nothing", "we never share").
- Legal text copied from another company.

## Left to the builder
Package layout and the link-markup format, visual styling inside existing design tokens, and wording within the content above. The builder must verify the third-party provider list and the cookie claim against the code.

## Open for the owner
- A contact email for privacy, deletion and takedown requests. Until it is given, the text uses one named constant, and a test fails while the constant is still the placeholder, so it cannot ship by accident.
- Account deletion: **decided by the owner: ship with "email us to delete" for now**, no deletion button. Apple requires apps that let people create an account to offer deletion inside the app, so this must be revisited before any App Store release.
