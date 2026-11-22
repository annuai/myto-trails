// The session cookie's name and settings.

import { SESSION_DAYS } from "./auth";

/** The name of the session cookie. */
export const SESSION_COOKIE = "mt_session";

/** Cookie settings: not readable by scripts, sent on same-site navigation, secure in production, and lasting as long as a session. */
export function sessionCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: production,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
