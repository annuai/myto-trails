import { cookies } from "next/headers";
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

/** The signed-in user for this request, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSessionUser(getSql(), token) : null;
}

/** For pages and actions that need an account: sends visitors to sign in and back again. */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return user;
}
