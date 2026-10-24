"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { saveTrail, unsaveTrail, unsaveTrailById } from "@/server/queries/saved";

export async function saveTrailAction(slug: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const result = await saveTrail(getSql(), user.id, slug, new Date());
  return { ok: result.saved };
}

export async function unsaveTrailAction(slug: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await unsaveTrail(getSql(), user.id, slug);
  return { ok: true };
}

export async function removeSavedAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const slug = formData.get("slug");
  const trailId = formData.get("trailId");
  if (typeof slug === "string") await unsaveTrail(getSql(), user.id, slug);
  else if (typeof trailId === "string" && /^[0-9a-f-]{36}$/i.test(trailId)) await unsaveTrailById(getSql(), user.id, trailId);
  revalidatePath("/saved");
}
