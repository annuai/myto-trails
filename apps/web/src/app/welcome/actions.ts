"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { safeNextPath } from "@/server/auth/safe-next";
import { getSql } from "@/server/db/client";
import { GENDER_NONE, parseGender } from "@/server/community/gender";
import { completeWelcome } from "@/server/community/members";

export type WelcomeState = { error?: string; values?: { displayName: string; profilePublic: string; gender: string } };

export async function welcomeAction(_prev: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const displayName = String(formData.get("displayName") ?? "");
  const choice = String(formData.get("visibility") ?? "");
  const genderChoice = String(formData.get("gender") ?? GENDER_NONE);
  const gender = parseGender(genderChoice);
  const values = { displayName, profilePublic: choice, gender: genderChoice };
  if (gender === "invalid") return { error: "Choose one of the gender options.", values };
  if (choice !== "public" && choice !== "private") return { error: "Choose whether to appear on trail rider lists.", values };
  const r = await completeWelcome(getSql(), { userId: user.id, confirmed: formData.get("declaration") === "on", displayName, profilePublic: choice === "public", gender });
  if (!r.ok) {
    const error = r.reason === "declaration_required" ? "Please confirm the declaration to continue." : r.reason === "invalid" ? "Use 2 to 40 characters for your name." : "We couldn't save that. Please try again.";
    return { error, values };
  }
  redirect(next);
}
