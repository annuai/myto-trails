"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { confirmSignIn } from "@/server/auth/auth";
import { safeNextPath } from "@/server/auth/safe-next";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session-cookie";
import { getSql } from "@/server/db/client";

export async function confirmAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const result = await confirmSignIn(getSql(), { token });
  if (!result.ok) redirect("/sign-in?expired=1");
  (await cookies()).set(SESSION_COOKIE, result.sessionToken, sessionCookieOptions(process.env.NODE_ENV === "production"));
  redirect(result.user.confirmed ? next : `/welcome?next=${encodeURIComponent(next)}`);
}
