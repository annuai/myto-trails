// Sending email: the sign-in message, a Resend sender for production, and a console sender for development.

import type { EmailConfig } from "../env";

/** A plain-text email to one address. */
export type EmailMessage = { to: string; subject: string; text: string };

/** Anything that can send an email: the real provider, or a stand-in for tests and development. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** The sign-in email with its link and how long the link works. */
export function signInEmail(i: { link: string; minutes: number }): { subject: string; text: string } {
  return {
    subject: "Your Moto Trails sign-in link",
    text: [
      "Open this link to sign in to Moto Trails:",
      "",
      i.link,
      "",
      `The link works once and expires in ${i.minutes} minutes.`,
      "If you didn't ask for it, you can ignore this email; nobody can sign in without the link.",
    ].join("\n"),
  };
}

/** Development sender: prints the message to the server log instead of sending it. */
export class ConsoleEmailSender implements EmailSender {
  async send(m: EmailMessage): Promise<void> {
    console.info(`[email] to=${m.to} subject=${m.subject}\n${m.text}`);
  }
  toString() {
    return "console";
  }
}

/** Sends email through Resend. */
export class ResendEmailSender implements EmailSender {
  readonly #config: { apiKey: string; from: string };
  constructor(config: { apiKey: string; from: string }) {
    this.#config = config;
  }
  async send(m: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.#config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.#config.from, to: [m.to], subject: m.subject, text: m.text }),
    });
    if (!res.ok) throw new Error(`Email provider refused the message (status ${res.status})`);
  }
  toString() {
    return "resend";
  }
  toJSON() {
    return { name: "resend" };
  }
}

/** The sender the configuration asks for: Resend, or the console sender otherwise. */
export function createEmailSender(config: EmailConfig): EmailSender {
  return config.provider === "resend" ? new ResendEmailSender({ apiKey: config.apiKey, from: config.from }) : new ConsoleEmailSender();
}
