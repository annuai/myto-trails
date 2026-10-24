import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSql } from "../db/client";
import { loadServerEnv } from "../env";
import { getSessionUser, type SessionUser } from "./auth";
import { createEmailSender, type EmailSender } from "./email";
import { SESSION_COOKIE } from "./session-cookie";

let sender: EmailSender | undefined;
export function getEmailSender(): EmailSender {
  sender ??= createEmailSender(loadServerEnv(process.env).email);
  return sender;
}

/** The signed-in user for this request, or null. Looked up once per request, however many parts of the page ask. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSessionUser(getSql(), token) : null;
});

/** For pages and actions that need an account: sends visitors to sign in and back again. */
export async function requireUser(returnTo: string, opts: { allowUnconfirmed?: boolean } = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  // The first sign-in ends with the 18+ and driving-licence declaration; nothing else is available before it.
  if (!user.confirmed && !opts.allowUnconfirmed) redirect(`/welcome?next=${encodeURIComponent(returnTo)}`);
  return user;
}
