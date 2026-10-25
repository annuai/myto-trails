"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut, signOutEverywhere, updateDisplayName } from "@/server/auth/auth";
import { SESSION_COOKIE } from "@/server/auth/session-cookie";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { updateMemberPrivacy } from "@/server/community/members";
import { removeBike, saveBike, setAvatar } from "@/server/community/profile";

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

export async function setAvatarAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Faccount");
  const mediaId = String(formData.get("mediaId") ?? "");
  if (formData.get("remove") === "1") await setAvatar(getSql(), { userId: user.id, mediaId: null });
  else if (!mediaId || !(await setAvatar(getSql(), { userId: user.id, mediaId })).ok) redirect("/account?avatar=error");
  redirect("/account?avatar=saved");
}

export async function saveBikeAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Faccount");
  const sql = getSql();
  if (formData.get("remove") === "1") {
    await removeBike(sql, user.id);
    redirect("/account?bike=saved");
  }
  const photo = String(formData.get("photoMediaId") ?? "");
  const r = await saveBike(sql, {
    userId: user.id, name: formData.get("name"), modelYear: formData.get("modelYear"),
    photoMediaId: formData.get("removePhoto") === "on" ? null : photo || undefined,
  });
  redirect(r.ok ? "/account?bike=saved" : "/account?bike=error");
}
