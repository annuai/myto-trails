"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site";
import { getCurrentUser, getEmailSender } from "@/server/auth/session";
import { getSql } from "@/server/db/client";
import { OFFER_TTL_HOURS, REVEAL_WINDOW_SECONDS } from "@/server/community/constants";
import { answeredEmail, newQuestionEmail, phoneOfferedEmail } from "@/server/community/emails";
import { answerQuestion, askRider, blockAsker, declineQuestion, offerPhone, reportQuestion, revealPhone, unblockRider, withdrawPhoneOffer } from "@/server/community/questions";
import { sendToUser } from "@/server/moderation/notify";

const text = (f: FormData, k: string) => String(f.get(k) ?? "");

async function member(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!user.confirmed) redirect(`/welcome?next=${encodeURIComponent(next)}`);
  return user;
}
const site = () => getSiteUrl(process.env);
const back = (code: string): never => redirect(`/account/questions?q=${encodeURIComponent(code)}`);

/** Asking happens on a trail page; the result comes back to the riders section of that page. */
export async function askRiderAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const user = await member(`/trails/${slug}`);
  const sql = getSql();
  const r = await askRider(sql, { userId: user.id, riderId: text(formData, "riderId"), slug, question: text(formData, "question"), now: new Date() });
  if (r.ok) await sendToUser(sql, getEmailSender(), r.answererId, newQuestionEmail(user.displayName, site()));
  redirect(`/trails/${encodeURIComponent(slug)}?c=${r.ok ? "ask_sent" : `ask_${r.reason}`}#riders`);
}

export async function answerAction(formData: FormData): Promise<void> {
  const user = await member("/account/questions");
  const sql = getSql();
  const r = await answerQuestion(sql, { userId: user.id, questionId: text(formData, "questionId"), answer: text(formData, "answer"), now: new Date() });
  if (r.ok) await sendToUser(sql, getEmailSender(), r.askerId, answeredEmail(user.displayName, site()));
  back(r.ok ? "answered" : `err_${r.reason}`);
}

export async function declineAction(formData: FormData): Promise<void> {
  const user = await member("/account/questions");
  const r = await declineQuestion(getSql(), { userId: user.id, questionId: text(formData, "questionId") });
  back(r.ok ? "declined" : `err_${r.reason}`);
}

export async function blockAction(formData: FormData): Promise<void> {
  const user = await member("/account/questions");
  const r = await blockAsker(getSql(), { userId: user.id, questionId: text(formData, "questionId") });
  back(r.ok ? "blocked" : `err_${r.reason}`);
}

export async function unblockAction(formData: FormData): Promise<void> {
  const user = await member("/account/questions");
  await unblockRider(getSql(), { userId: user.id, blockedId: text(formData, "blockedId") });
  back("unblocked");
}

export async function reportQuestionAction(formData: FormData): Promise<void> {
  const user = await member("/account/questions");
  const r = await reportQuestion(getSql(), { userId: user.id, questionId: text(formData, "questionId"), reason: text(formData, "reason") });
  back(r.ok ? "reported" : `err_${r.reason}`);
}

export async function offerPhoneAction(formData: FormData): Promise<void> {
  const user = await member("/account/questions");
  const sql = getSql();
  const r = await offerPhone(sql, { userId: user.id, questionId: text(formData, "questionId"), phone: text(formData, "phone"), now: new Date() });
  if (r.ok) await sendToUser(sql, getEmailSender(), r.askerId, phoneOfferedEmail(user.displayName, site(), OFFER_TTL_HOURS, REVEAL_WINDOW_SECONDS / 60));
  back(r.ok ? "offered" : `err_${r.reason}`);
}

export async function withdrawOfferAction(formData: FormData): Promise<void> {
  const user = await member("/account/questions");
  await withdrawPhoneOffer(getSql(), { userId: user.id, questionId: text(formData, "questionId") });
  back("withdrawn");
}

export type RevealState = { phone?: string; expiresAt?: string; remainingSeconds?: number; error?: string };

/** Returns the number to the page that asked, for the time left in its window. It is never put in a URL or a cookie. */
export async function revealPhoneAction(_prev: RevealState, formData: FormData): Promise<RevealState> {
  const user = await member("/account/questions");
  const r = await revealPhone(getSql(), { userId: user.id, questionId: text(formData, "questionId"), now: new Date() });
  if (!r.ok) return { error: r.reason === "expired" ? "This number is no longer available." : "Nothing to reveal." };
  return { phone: r.phone, expiresAt: r.expiresAt, remainingSeconds: r.remainingSeconds };
}
