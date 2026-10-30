import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import type { EmailMessage, EmailSender } from "./email";
import {
  confirmSignIn, getSessionUser, normalizeEmail, peekLoginToken, requestSignIn, signOut, signOutEverywhere, updateDisplayName,
} from "./auth";
import { hashToken } from "./tokens";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

class Recorder implements EmailSender {
  sent: EmailMessage[] = [];
  async send(m: EmailMessage) {
    this.sent.push(m);
  }
}
const failing: EmailSender = { send: async () => { throw new Error("smtp down"); } };
const baseUrl = "https://moto-trails.com";
let n = 0;
const email = () => `user${++n}@example.test`;
const tokenFrom = (m: EmailMessage) => new URL(m.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

async function signIn(addr: string, ip = `ip${++n}`) {
  const sender = new Recorder();
  const r = await requestSignIn(db.sql, { email: addr, ipHash: ip, sender, baseUrl });
  return { sender, r, token: sender.sent[0] ? tokenFrom(sender.sent[0]) : undefined };
}

describe("normalizeEmail", () => {
  it.each([["  A@Example.TEST ", "a@example.test"], ["b@example.test", "b@example.test"]])("%j -> %j", (i, o) => {
    expect(normalizeEmail(i)).toBe(o);
  });
  it.each(["", "nope", "a@", "@b.c", "a b@c.d", `${"x".repeat(250)}@e.test`, "a@b@c.d"])("rejects %j", (i) => {
    expect(normalizeEmail(i)).toBeNull();
  });
});

describe("requestSignIn", () => {
  it("emails a one-time link and stores only the hash", async () => {
    const addr = email();
    const { sender, r, token } = await signIn(addr);
    expect(r.status).toBe("sent");
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]!.to).toBe(addr);
    expect(sender.sent[0]!.text).toContain("https://moto-trails.com/auth/confirm?token=");
    const rows = await db.sql`select token_hash, expires_at > now() as live from login_token where email = ${addr}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.token_hash).toBe(hashToken(token!));
    expect(rows[0]!.token_hash).not.toBe(token);
    expect(rows[0]!.live).toBe(true);
    const [dump] = await db.sql`select to_jsonb(l)::text as j from login_token l where email = ${addr}`;
    expect(dump!.j).not.toContain(token!);
  });

  it("does nothing for an invalid address but answers the same way", async () => {
    const sender = new Recorder();
    const r = await requestSignIn(db.sql, { email: "not-an-email", ipHash: "ip-x", sender, baseUrl });
    expect(r.status).toBe("sent");
    expect(sender.sent).toHaveLength(0);
  });

  it("answers the same way when the email provider fails", async () => {
    const r = await requestSignIn(db.sql, { email: email(), ipHash: "ip-y", sender: failing, baseUrl });
    expect(r.status).toBe("sent");
  });

  it("only carries a same-site next path into the link", async () => {
    const sender = new Recorder();
    await requestSignIn(db.sql, { email: email(), ipHash: "ip-n1", sender, baseUrl, next: "/saved" });
    await requestSignIn(db.sql, { email: email(), ipHash: "ip-n2", sender, baseUrl, next: "https://evil.example/x" });
    expect(new URL(sender.sent[0]!.text.match(/https?:\/\/\S+/)![0]).searchParams.get("next")).toBe("/saved");
    expect(new URL(sender.sent[1]!.text.match(/https?:\/\/\S+/)![0]).searchParams.get("next")).toBe("/");
  });

  it("limits requests to 5 per hour per address, counting +tag and case variants together", async () => {
    const sender = new Recorder();
    const results: string[] = [];
    for (const variant of ["lim@example.test", "LIM@example.test", "lim+a@example.test", "lim+b@example.test", "lim+c@example.test", "lim@example.test"]) {
      results.push((await requestSignIn(db.sql, { email: variant, ipHash: `ip-lim-${results.length}`, sender, baseUrl })).status);
    }
    expect(results).toEqual(["sent", "sent", "sent", "sent", "sent", "rate_limited"]);
    expect(sender.sent).toHaveLength(5);
  });

  it("does not require an IP bucket when the network address is unknown", async () => {
    const sender = new Recorder();
    let last = "";
    for (let i = 0; i < 25; i++) last = (await requestSignIn(db.sql, { email: email(), ipHash: null, sender, baseUrl })).status;
    expect(last).toBe("sent");
    expect(sender.sent).toHaveLength(25);
  });

  it("checks the network limit first, so a flood from one network cannot use up a victim's address limit", async () => {
    const sender = new Recorder();
    for (let i = 0; i < 20; i++) await requestSignIn(db.sql, { email: email(), ipHash: "ip-flood", sender, baseUrl });
    for (let i = 0; i < 6; i++) {
      expect((await requestSignIn(db.sql, { email: "victim@example.test", ipHash: "ip-flood", sender, baseUrl })).status).toBe("rate_limited");
    }
    const results: string[] = [];
    for (let i = 0; i < 5; i++) results.push((await requestSignIn(db.sql, { email: "victim@example.test", ipHash: `ip-calm-${i}`, sender, baseUrl })).status);
    expect(results).toEqual(["sent", "sent", "sent", "sent", "sent"]);
  });

  it("limits requests to 20 per hour per network", async () => {
    const sender = new Recorder();
    let last = "";
    for (let i = 0; i < 21; i++) last = (await requestSignIn(db.sql, { email: email(), ipHash: "ip-shared", sender, baseUrl })).status;
    expect(last).toBe("rate_limited");
    expect(sender.sent).toHaveLength(20);
  });
});

describe("confirmSignIn", () => {
  it("signs in once, creates the user and a session, and the token cannot be reused", async () => {
    const addr = email();
    const { token } = await signIn(addr);
    expect(await peekLoginToken(db.sql, token!)).toBe(true);
    const first = await confirmSignIn(db.sql, { token: token! });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.user.email).toBe(addr);
    expect(first.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await peekLoginToken(db.sql, token!)).toBe(false);
    expect(await confirmSignIn(db.sql, { token: token! })).toEqual({ ok: false, reason: "invalid" });
  });

  it("derives a display name from the address", async () => {
    const { token } = await signIn("trail.rider@example.test");
    const r = await confirmSignIn(db.sql, { token: token! });
    expect(r.ok && r.user.displayName).toBe("trail.rider");
  });

  it("reuses the same account for the same address and starts a new session each time", async () => {
    const addr = email();
    const a = await confirmSignIn(db.sql, { token: (await signIn(addr)).token! });
    const b = await confirmSignIn(db.sql, { token: (await signIn(addr.toUpperCase())).token! });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.user.id).toBe(b.user.id);
      expect(a.sessionToken).not.toBe(b.sessionToken);
    }
  });

  it("rejects unknown, expired and malformed tokens the same way", async () => {
    expect(await confirmSignIn(db.sql, { token: "definitely-not-a-token" })).toEqual({ ok: false, reason: "invalid" });
    expect(await confirmSignIn(db.sql, { token: "" })).toEqual({ ok: false, reason: "invalid" });
    const { token } = await signIn(email());
    await db.sql`update login_token set expires_at = now() - interval '1 second' where token_hash = ${hashToken(token!)}`;
    expect(await peekLoginToken(db.sql, token!)).toBe(false);
    expect(await confirmSignIn(db.sql, { token: token! })).toEqual({ ok: false, reason: "invalid" });
  });

  it("accepts a token right up to its expiry", async () => {
    const { token } = await signIn(email());
    await db.sql`update login_token set expires_at = now() + interval '2 seconds' where token_hash = ${hashToken(token!)}`;
    expect((await confirmSignIn(db.sql, { token: token! })).ok).toBe(true);
  });

  it("lets only one of two simultaneous confirmations succeed", async () => {
    const { token } = await signIn(email());
    const results = await Promise.all([confirmSignIn(db.sql, { token: token! }), confirmSignIn(db.sql, { token: token! })]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("does not sign in a suspended account", async () => {
    const addr = email();
    await confirmSignIn(db.sql, { token: (await signIn(addr)).token! });
    await db.sql`update app_user set status = 'suspended' where email = ${addr}`;
    expect(await confirmSignIn(db.sql, { token: (await signIn(addr)).token! })).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("sessions", () => {
  async function session() {
    const r = await confirmSignIn(db.sql, { token: (await signIn(email())).token! });
    if (!r.ok) throw new Error("sign-in failed");
    return r;
  }

  it("resolves the user from the token and stores only its hash", async () => {
    const s = await session();
    expect(await getSessionUser(db.sql, s.sessionToken)).toMatchObject({ id: s.user.id, email: s.user.email, roles: [] });
    const rows = await db.sql`select token_hash from auth_session where user_id = ${s.user.id}`;
    expect(rows[0]!.token_hash).toBe(hashToken(s.sessionToken));
    const [dump] = await db.sql`select to_jsonb(a)::text as j from auth_session a where user_id = ${s.user.id}`;
    expect(dump!.j).not.toContain(s.sessionToken);
  });

  it("returns null for unknown, empty and expired tokens", async () => {
    const s = await session();
    expect(await getSessionUser(db.sql, "nope")).toBeNull();
    expect(await getSessionUser(db.sql, "")).toBeNull();
    await db.sql`update auth_session set expires_at = now() - interval '1 second' where user_id = ${s.user.id}`;
    expect(await getSessionUser(db.sql, s.sessionToken)).toBeNull();
  });

  it("stops working for suspended or deleted users", async () => {
    const s = await session();
    await db.sql`update app_user set status = 'suspended' where id = ${s.user.id}`;
    expect(await getSessionUser(db.sql, s.sessionToken)).toBeNull();
  });

  it("is removed by signOut and by signOutEverywhere", async () => {
    const a = await session();
    await signOut(db.sql, a.sessionToken);
    expect(await getSessionUser(db.sql, a.sessionToken)).toBeNull();
    const addr = email();
    const s1 = await confirmSignIn(db.sql, { token: (await signIn(addr)).token! });
    const s2 = await confirmSignIn(db.sql, { token: (await signIn(addr)).token! });
    if (!s1.ok || !s2.ok) throw new Error("sign-in failed");
    await signOutEverywhere(db.sql, s1.user.id);
    expect(await getSessionUser(db.sql, s1.sessionToken)).toBeNull();
    expect(await getSessionUser(db.sql, s2.sessionToken)).toBeNull();
  });

  it("includes the user's roles", async () => {
    const s = await session();
    await db.sql`insert into user_role (user_id, role) values (${s.user.id}, 'moderator')`; // no country: signs in as a moderator, acts nowhere yet
    expect((await getSessionUser(db.sql, s.sessionToken))!.roles).toEqual(["moderator"]);
  });

  it("updates the display name within bounds", async () => {
    const s = await session();
    await updateDisplayName(db.sql, s.user.id, "  New Name ");
    expect((await getSessionUser(db.sql, s.sessionToken))!.displayName).toBe("New Name");
    await expect(updateDisplayName(db.sql, s.user.id, "x")).rejects.toThrow(/display name/i);
    await expect(updateDisplayName(db.sql, s.user.id, "x".repeat(41))).rejects.toThrow(/display name/i);
  });
});
