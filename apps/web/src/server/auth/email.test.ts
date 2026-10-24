import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleEmailSender, ResendEmailSender, createEmailSender, signInEmail } from "./email";

afterEach(() => vi.unstubAllGlobals());

describe("signInEmail", () => {
  it("contains the link, the validity and a note for people who did not ask", () => {
    const e = signInEmail({ link: "https://moto-trails.com/auth/confirm?token=abc", minutes: 15 });
    expect(e.subject).toBe("Your Moto Trails sign-in link");
    expect(e.text).toContain("https://moto-trails.com/auth/confirm?token=abc");
    expect(e.text).toContain("15 minutes");
    expect(e.text).toMatch(/didn.t ask/i);
  });
});

describe("ConsoleEmailSender", () => {
  it("prints the message for development", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await new ConsoleEmailSender().send({ to: "a@example.test", subject: "S", text: "link here" });
    expect(log.mock.calls.flat().join(" ")).toContain("link here");
    log.mockRestore();
  });
});

describe("ResendEmailSender", () => {
  it("posts to the Resend API with a bearer key and the message", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new ResendEmailSender({ apiKey: "re_secret", from: "Moto Trails <no-reply@moto-trails.com>" }).send({ to: "a@example.test", subject: "S", text: "T" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_secret");
    expect(JSON.parse(init.body as string)).toEqual({ from: "Moto Trails <no-reply@moto-trails.com>", to: ["a@example.test"], subject: "S", text: "T" });
  });
  it("throws without leaking the key when the API refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 403 })));
    const sender = new ResendEmailSender({ apiKey: "re_secret", from: "x@y.z" });
    await expect(sender.send({ to: "a@example.test", subject: "S", text: "T" })).rejects.toThrow(/403/);
    await expect(sender.send({ to: "a@example.test", subject: "S", text: "T" })).rejects.not.toThrow(/re_secret/);
  });
  it("does not print the key when stringified", () => {
    const sender = new ResendEmailSender({ apiKey: "re_secret", from: "x@y.z" });
    expect(String(sender)).toBe("resend");
    expect(JSON.stringify(sender)).not.toContain("re_secret");
  });
});

describe("createEmailSender", () => {
  it("builds the sender named by the configuration", () => {
    expect(createEmailSender({ provider: "console" })).toBeInstanceOf(ConsoleEmailSender);
    expect(createEmailSender({ provider: "resend", apiKey: "k", from: "f" })).toBeInstanceOf(ResendEmailSender);
  });
});
