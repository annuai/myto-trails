# ADR 0007: The phone app signs in through the website

**Status:** accepted (2026-10-26), builds on [ADR 0005](0005-own-passwordless-auth.md) and [ADR 0006](0006-device-tokens-for-api.md). **Source:** [docs/16](../16-myto-app-ui.md).

**Context.** The owner wants the app to sign in "just like the website" and to use the existing trails database, without a second database or a second account system. ADR 0006 left the app copying a device token by hand. Doc 15 §4.5 proposes a shared identity with the Myto shop; that is not built and is not required for this.

**Decision.**
- **No new database and no direct database access from the app.** The app calls `/api/v1` only. The website keeps reading Supabase (Postgres) with row-level security and public DTOs; the service key and `DATABASE_URL` never leave the server.
- **Sign-in is the website's own email link.** The app opens `/auth/app?challenge=…&redirect_uri=…&state=…`. A visitor who is not signed in is sent through `/sign-in` and the email link with this page as the destination (the existing `next` mechanism). A signed-in rider presses "Connect the app".
- **PKCE (RFC 7636, S256).** The app keeps a random verifier and sends its SHA-256 as the challenge. The page stores a one-time code (hash only, 5 minutes, single use) bound to the challenge and redirects to the app. The app calls `POST /api/v1/auth/token` with `code` and `verifier`, and receives an ordinary revocable device token (scopes `saved` and `write:submission`, kind `app_android` or `app_ios`). A code seen by another app is useless without the verifier. A wrong verifier burns the code.
- **Redirect allow-list, exact match:** `myto://auth`, anything in `APP_REDIRECT_URIS`, and, outside production, `http://localhost:8081/auth/callback` for the web test build.
- **Sign out** revokes the token (`DELETE /api/v1/auth/token`). `GET /api/v1/me` returns who the token belongs to.
- **CORS** for browser origins listed in `API_CORS_ORIGINS` (plus `http://localhost:8081` outside production). Bearer tokens only, no cookies, so CORS adds no ambient authority. Native apps need none.

**Consequences.** One account for web and app, no new credentials, and the app's tokens appear under Account, Connected devices like any other. The token lives in the Keychain or Keystore on a phone and in localStorage in the web test build (acceptable for testing, not for a production web client). Cloud storage (R2) needs a CORS rule only if a web build uploads straight to a signed URL; native apps do not. The shop's Supabase sign-in (doc 15 §4.5) can still be added later as another way to obtain a bearer token without changing the app's endpoints.
