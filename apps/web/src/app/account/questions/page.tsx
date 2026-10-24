import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { QuestionsInbox } from "@/features/community/QuestionsInbox";
import { answerAction, blockAction, declineAction, offerPhoneAction, reportQuestionAction, revealPhoneAction, unblockAction, withdrawOfferAction } from "@/features/community/question-actions";
import { requireUser } from "@/server/auth/session";
import { listBlocked, listQuestions } from "@/server/community/questions";
import { getSql } from "@/server/db/client";

export const instant = false;
export const metadata: Metadata = { title: "Your questions", robots: { index: false, follow: false } };

const NOTES: Record<string, string> = {
  answered: "Your answer was sent.", declined: "Declined.", blocked: "Blocked. They can't ask you again.", unblocked: "Unblocked.", reported: "Thank you. A moderator will look at it.",
  offered: "Your number is offered. The other rider has 24 hours to reveal it.", withdrawn: "The offer was taken back and the number deleted.",
  err_invalid: "That didn't look right. Check it and try again.", err_expired: "That question has expired.", err_wrong_state: "That can't be done now.", err_not_found: "That question isn't available.", err_rate_limited: "Too many today. Try again tomorrow.",
};

export default async function QuestionsPage({ searchParams }: PageProps<"/account/questions">) {
  const user = await requireUser("/account/questions");
  const sp = await searchParams;
  await connection();
  const sql = getSql();
  const [{ received, sent }, blocked] = await Promise.all([listQuestions(sql, user.id, new Date()), listBlocked(sql, user.id)]);
  const note = typeof sp.q === "string" ? NOTES[sp.q] : undefined;
  return (
    <section className="flex max-w-3xl flex-col gap-8 py-8">
      <Link href="/account" className="text-sm underline underline-offset-4">Back to account</Link>
      <h1 className="text-3xl font-semibold leading-tight">Your questions</h1>
      <p className="max-w-prose text-muted">Riders can ask each other about trails. There is no chat: one question, one answer. A phone number is shared only if the person asked offers it, is shown once for five minutes, and is then deleted.</p>
      {note ? <p role="status" className="border-l-4 border-status-good py-1 pl-4 font-medium">{note}</p> : null}
      <QuestionsInbox
        received={received} sent={sent} blocked={blocked} unblock={unblockAction}
        actions={{ answer: answerAction, decline: declineAction, block: blockAction, report: reportQuestionAction, offer: offerPhoneAction, withdraw: withdrawOfferAction, reveal: revealPhoneAction }}
      />
    </section>
  );
}
