"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { parseStepForm } from "@/features/submit/parse-form";
import type { WizardState } from "@/features/submit/WizardForm";
import { getCurrentUser } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { STEPS, type Step } from "@/server/submissions/schema";
import { attachRoute, createDraft, discardDraft, saveStep, submit } from "@/server/submissions/service";

const asStep = (v: unknown): Step | null => {
  const n = Number(v);
  return (STEPS as readonly number[]).includes(n) ? (n as Step) : null;
};

async function userOrSignIn(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

export async function startSubmissionAction(): Promise<void> {
  const user = await userOrSignIn("/submit");
  const r = await createDraft(getSql(), { userId: user.id, clientId: randomUUID() });
  if (!r.ok) redirect("/submit?error=too_many_drafts");
  redirect(`/submit/${r.id}/1`);
}

const SAVE_ERROR: Record<string, string> = {
  not_found: "This submission is no longer available.",
  locked: "This submission has already been sent and can't be edited right now.",
  too_large: "That is more text than we can keep. Please shorten it.",
  invalid: "We couldn't read that form. Please try again.",
};

/** The form action for every step: saves, then moves on, stays, or submits depending on the button pressed. */
export async function saveStepAction(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const id = String(formData.get("id") ?? "");
  const step = asStep(formData.get("step"));
  const intent = String(formData.get("intent") ?? "next");
  if (!step) return { message: "Unknown step." };
  const user = await userOrSignIn(`/submit/${id}/${step}`);

  const input = parseStepForm(step, formData);
  const values = Array.isArray(input) ? undefined : input;
  const saved = await saveStep(getSql(), { userId: user.id, id, step, input });
  if (!saved.ok) {
    if ("errors" in saved) return { errors: saved.errors, values, message: "Some answers need attention." };
    return { message: SAVE_ERROR[saved.reason] ?? "We couldn't save this step.", values };
  }

  if (intent === "submit" && step === 6) {
    const r = await submit(getSql(), { userId: user.id, id, now: new Date() });
    if (r.ok) redirect(`/account/contributions/${id}?sent=1`);
    if (r.reason === "invalid") return { message: `These steps still need attention: ${r.steps.join(", ")}.`, steps: r.steps, values };
    if (r.reason === "country_not_open") return { message: r.message, steps: [2], values };
    if (r.reason === "rate_limited") return { message: "You've sent several trails today. Please try again tomorrow.", values };
    if (r.reason === "photo_unavailable") return { message: "One of your photos or your route is no longer available. Check steps 2 and 5.", values };
    return { message: SAVE_ERROR[r.reason] ?? "We couldn't submit this trail.", values };
  }
  if (intent === "save") return { saved: true, values };
  redirect(`/submit/${id}/${Math.min(6, step + 1)}`);
}

/** Background save while typing: keeps raw input so a closed tab or lost connection loses nothing. */
export async function autosaveStepAction(id: string, stepValue: number, formData: FormData): Promise<void> {
  const step = asStep(stepValue);
  const user = await getCurrentUser();
  if (!step || !user) return;
  await saveStep(getSql(), { userId: user.id, id, step, input: parseStepForm(step, formData), autosave: true });
}

export async function attachRouteAction(id: string, uploadId: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const r = await attachRoute(getSql(), { userId: user.id, id, uploadId });
  return { ok: r.ok };
}

export async function discardDraftAction(formData: FormData): Promise<void> {
  const user = await userOrSignIn("/submit");
  await discardDraft(getSql(), { userId: user.id, id: String(formData.get("id") ?? "") });
  redirect("/submit");
}
