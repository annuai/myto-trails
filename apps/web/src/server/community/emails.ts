import type { EmailMessage } from "../auth/email";

const oneLine = (s: string) => s.replace(/[\r\n\u2028\u2029]+/g, " ").trim().slice(0, 80);
type Msg = Pick<EmailMessage, "subject" | "text">;

/** Emails about questions never contain the question, the answer or a phone number: they only point to the inbox. */
export function newQuestionEmail(askerName: string, siteUrl: string): Msg {
  return {
    subject: `${oneLine(askerName)} asked you a question on Moto Trails`,
    text: ["A rider asked you a question about a trail you have ridden.", "", `Read it and reply, decline or block here: ${siteUrl}/account/questions`, "", "You decide whether to answer, and whether to share a phone number. Nothing is shared unless you choose to."].join("\n"),
  };
}

export function answeredEmail(riderName: string, siteUrl: string): Msg {
  return { subject: `${oneLine(riderName)} answered your question`, text: ["A rider answered your question on Moto Trails.", "", `Read the answer: ${siteUrl}/account/questions`].join("\n") };
}

export function phoneOfferedEmail(riderName: string, siteUrl: string, hours: number, minutes: number): Msg {
  return {
    subject: `${oneLine(riderName)} offered to share their phone number`,
    text: [
      "A rider offered you their phone number.",
      "",
      `Open ${siteUrl}/account/questions and press Reveal within ${hours} hours. Once you reveal it, you will see it for ${minutes} minutes: save it to your contacts in that time. It is then deleted and cannot be shown again.`,
      "",
      "The number is not in this email on purpose.",
    ].join("\n"),
  };
}

/** Club emails say who and where, never the phone number or the message. */
export function joinRequestEmail(riderName: string, clubName: string, clubUrl: string): Msg {
  return {
    subject: `${oneLine(riderName)} asked to join ${oneLine(clubName)}`,
    text: ["A rider asked to join a club you manage.", "", `Review the request (you can see their phone number there): ${clubUrl}`, "", "The number is not in this email on purpose."].join("\n"),
  };
}

export function joinDecisionEmail(clubName: string, accepted: boolean, clubUrl: string): Msg {
  return accepted
    ? { subject: `You are in: ${oneLine(clubName)}`, text: ["Your request to join the club was accepted.", "", `Open the club: ${clubUrl}`].join("\n") }
    : { subject: `Your request to join ${oneLine(clubName)}`, text: "The club's admins did not accept your request this time." };
}
