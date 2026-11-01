"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { markWomenSafe, unmarkWomenSafe } from "@/server/community/women-safe";

const slugOf = (f: FormData) => String(f.get("slug") ?? "");
const here = (slug: string) => `/trails/${encodeURIComponent(slug)}`;
const back = (slug: string, result: string): never => redirect(`${here(slug)}?c=${encodeURIComponent(result)}#women-safe`);

export async function markWomenSafeAction(formData: FormData): Promise<void> {
  const slug = slugOf(formData);
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(here(slug))}`);
  const r = await markWomenSafe(getSql(), { userId: user.id, slug, now: new Date() });
  back(slug, r.ok ? "women_safe" : `women_safe_${r.reason}`);
}

export async function unmarkWomenSafeAction(formData: FormData): Promise<void> {
  const slug = slugOf(formData);
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(here(slug))}`);
  await unmarkWomenSafe(getSql(), { userId: user.id, slug });
  back(slug, "women_unsafe");
}
