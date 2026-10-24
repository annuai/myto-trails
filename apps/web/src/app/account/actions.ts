"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut, signOutEverywhere, updateDisplayName } from "@/server/auth/auth";
import { SESSION_COOKIE } from "@/server/auth/session-cookie";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { updateMemberPrivacy } from "@/server/community/members";

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await signOut(getSql(), token);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

export async function signOutEverywhereAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await signOutEverywhere(getSql(), user.id);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

export async function updateNameAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Faccount");
  try {
    await updateDisplayName(getSql(), user.id, String(formData.get("name") ?? ""));
  } catch {
    redirect("/account?error=name");
  }
  redirect("/account?saved=1");
}

export async function updatePrivacyAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Faccount");
  const sql = getSql();
  const r = await updateMemberPrivacy(sql, {
    userId: user.id,
    profilePublic: formData.get("visibility") === "public",
    isWoman: formData.get("isWoman") === "on",
    bio: String(formData.get("bio") ?? "").trim() || null,
  });
  redirect(r.ok ? "/account?privacy=saved" : "/account?privacy=error");
}
