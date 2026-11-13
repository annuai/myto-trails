# To do later

Things that are decided or half-built and waiting on something outside the code. Newest first.

## Push notifications (waiting for a paid Apple Developer account)

Needs the **Apple Developer Program** (paid). Without it an iPhone app cannot receive remote push; local reminders (to-dos, trips, daylight) already work and are unaffected.

When the account exists:
1. In Apple Developer, Certificates, Identifiers & Profiles, Keys: create a key with **Apple Push Notifications service**, download the `.p8` once, note the Key ID and the Team ID (`42XYUS7TVE`).
2. Give the key to Expo (an Expo account and `eas credentials`), and turn on the Push Notifications capability for `com.myto-moto.myto` (also its widget extension's App Group profile).
3. App: ask permission, get the Expo push token, send it to the site; add a `push_token` table (user, token, platform, last seen) and a route to register and remove it.
4. Site: send through Expo's push API (free) in batches of 100, only to members of the club, never to the author. First messages: new photo or post in a club, a reaction to your post, a ride event starting, a join request decided. Keep the same opt-out and quiet-hours rules as the local reminders.
5. Remove a token when Expo reports it invalid; delete a rider's tokens on account deletion and in the retention purge.

Until then the club feed refreshes when the screen opens and while it stays open.

## Other open items

- **Rider story:** Before standing is useful in production, set `CRON_SECRET` on Vercel (the rollup needs it; migration 0048 is applied). More Pillion poses (helmet, chai stall, rain) are P1; see `apps/mobile/assets/pillion/README.md`. Move cells to districts for a district once it has 20 opted-in riders (`ride_summary` stores a 1-degree cell, so district challenges cannot be counted yet).
- **R2 lifecycle rule:** expire objects in the `quarantine` bucket after one day. Photos that were sent but never posted leave nothing in the database for the purge to find.
- **Custom domain for the public bucket** behind Cloudflare, so photos are cached at the edge (the `r2.dev` address is rate limited and not for production). Set `R2_PUBLIC_BASE_URL` to it.
- **GitHub `CRON_SECRET`** must equal the Vercel one (the check-in sweep got a 401 on 6 Nov 2026). Reveal the Vercel value, then `pbpaste | gh secret set CRON_SECRET --repo annuai/myto-trails`, and run the Check-in sweep workflow to confirm.
- **Video in club posts:** short clips (15 s or less), compressed on the phone, stored in R2. Not started.
- **Community heat map:** needs sync, consent and 30 or more active riders first (see the architecture notes in the conversation of 5 Nov 2026 and `docs/sync-design.md`).
