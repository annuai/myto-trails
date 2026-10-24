# ADR 0005: Own passwordless authentication

**Status:** accepted (2026-10-24), amends [ADR 0002](0002-supabase-database-and-auth.md). **Source:** [M3 plan](../superpowers/plans/2026-10-24-m3-accounts.md), [docs/05 §6](../05-technical-architecture.md), [docs/11](../11-security-and-moderation.md).

**Context.** ADR 0002 chose Supabase Auth, but no Supabase or Google credentials exist yet and the build must continue without them. Authentication is needed for Saved trails, reports and (later) submissions and moderation.

**Decision.** Email-link sign-in implemented in the application database:
- Sign-in tokens and session tokens are 256-bit random values; only their SHA-256 hashes are stored.
- A link is valid for 15 minutes and single use. Opening it shows a confirmation page; consuming the token happens on a POST so email scanners cannot use it up.
- The session cookie is HttpOnly, SameSite=Lax, Secure in production, 30 days; every sign-in creates a new session; sign-out deletes it server-side.
- Sign-in requests are rate limited per email and per IP hash, and the response never reveals whether an account exists.
- Email goes through an `EmailSender` interface (console in development, Resend in production).
- User tables are closed to the anonymous role; account data is read through functions that take the user id from the verified session.

**Consequences.** No external auth dependency or credentials are needed to run the product. Google sign-in and passkeys are not built (Google needs OAuth credentials). Supabase Auth can still be added later as another provider, linking accounts by verified email. We own the security of this code: it is covered by database tests and gets the whole-branch review at the end of M3.
