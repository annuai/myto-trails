import type { Sql } from "postgres";
import type { EmailMessage, EmailSender } from "../auth/email";
import type { Notify } from "./decisions";
import type { ReportOutcome } from "./reports";

const oneLine = (s: string) => s.replace(/[\r\n\u2028\u2029]+/g, " ").trim().slice(0, 120);

export function decisionEmail(n: Notify, siteUrl: string): Pick<EmailMessage, "subject" | "text"> {
  const title = oneLine(n.title);
  const mine = `${siteUrl}/account/contributions`;
  if (n.outcome === "approved") {
    return {
      subject: `Your trail is published: ${title}`,
      text: ["Good news: a moderator approved your trail and it is now on Moto Trails.", "", n.slug ? `${siteUrl}/trails/${n.slug}` : mine, "", "Thank you for sharing it."].join("\n"),
    };
  }
  if (n.outcome === "changes_requested") {
    return {
      subject: `A few changes needed: ${title}`,
      text: ["A moderator reviewed your trail and asked for some changes before it can be published.", "", n.comment ?? "", "", `Edit and resubmit here: ${mine}`].join("\n"),
    };
  }
  return {
    subject: `Update on your submission: ${title}`,
    text: ["Thank you for submitting your trail. After review, a moderator could not publish it this time.", "", n.comment ?? "", "", `You can see the details here: ${mine}`].join("\n"),
  };
}

export function reportOutcomeEmail(n: { reporterId: string | null; outcome: ReportOutcome; trailName: string; note: string }, siteUrl: string): Pick<EmailMessage, "subject" | "text"> {
  const result = { accepted: "We acted on your report.", rejected: "We reviewed your report and could not confirm the problem.", needs_info: "We need a little more information about your report.", duplicate: "Another report already covers this; thank you for confirming it." }[n.outcome];
  return {
    subject: `Your report about ${oneLine(n.trailName)}`,
    text: ["Thank you for helping keep Moto Trails accurate.", "", result, n.note ? `\nNote from the moderator: ${n.note}` : "", "", `${siteUrl}/trails`].join("\n"),
  };
}

/** Emails an active account. A failing provider never breaks the action that triggered the message. */
export async function sendToUser(sql: Sql, sender: EmailSender, userId: string, message: Pick<EmailMessage, "subject" | "text">): Promise<void> {
  try {
    const [u] = await sql`select email from app_user where id = ${userId} and status = 'active'`;
    if (!u) return;
    await sender.send({ to: u.email as string, ...message });
  } catch (e) {
    console.error("Notification failed", e instanceof Error ? e.message : "unknown");
  }
}
