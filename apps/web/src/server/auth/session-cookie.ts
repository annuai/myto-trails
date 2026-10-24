import { SESSION_DAYS } from "./auth";

export const SESSION_COOKIE = "mt_session";

export function sessionCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: production,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
