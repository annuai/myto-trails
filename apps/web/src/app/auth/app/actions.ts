"use server";

import { redirect } from "next/navigation";
import { allowedRedirects, createAppCode, isAllowedRedirect, isChallenge } from "@/server/auth/app-auth";
import { requireUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";

export async function authorizeAppAction(formData: FormData): Promise<void> {
  const challenge = String(formData.get("challenge") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "").slice(0, 200);
  if (!isChallenge(challenge) || !isAllowedRedirect(redirectUri, allowedRedirects(process.env))) redirect("/");
  const user = await requireUser("/");
  const code = await createAppCode(getSql(), { userId: user.id, challenge });
  const sep = redirectUri.includes("?") ? "&" : "?";
  redirect(`${redirectUri}${sep}code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
}
