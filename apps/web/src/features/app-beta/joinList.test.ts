import { describe, expect, it, vi } from "vitest";
import { joinList } from "./joinList";

const env = { MYTO_WAITLIST_URL: "https://myto-moto.com/api/waitlist" };
const ok = () => vi.fn(async () => new Response("{}", { status: 200 }));

describe("joinList", () => {
  it("rejects a bad email without calling out", async () => {
    const send = ok();
    expect(await joinList({ email: "nope", platform: "", honeypot: "" }, env, send)).toEqual({ error: "Enter a valid email address.", success: false });
    expect(send).not.toHaveBeenCalled();
  });

  it("posts the cleaned email tagged with this site", async () => {
    const send = ok();
    expect(await joinList({ email: "  Rider@Example.com ", platform: "iphone", honeypot: "" }, env, send)).toEqual({ error: null, success: true });
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(env.MYTO_WAITLIST_URL);
    expect(JSON.parse(String(init.body))).toEqual({ email: "rider@example.com", platform: "iphone", source: "moto-trails" });
  });

  it("quietly succeeds on the honeypot, sending nothing", async () => {
    const send = ok();
    expect(await joinList({ email: "bot@example.com", platform: "", honeypot: "x" }, env, send)).toEqual({ error: null, success: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("explains when the list address is not configured", async () => {
    expect((await joinList({ email: "a@b.co", platform: "", honeypot: "" }, {}, ok())).success).toBe(false);
  });

  it("reports a failed or unreachable list", async () => {
    const bad = vi.fn(async () => new Response("{}", { status: 500 }));
    expect((await joinList({ email: "a@b.co", platform: "", honeypot: "" }, env, bad)).success).toBe(false);
    const down = vi.fn(async () => { throw new Error("offline"); });
    expect((await joinList({ email: "a@b.co", platform: "", honeypot: "" }, env, down)).success).toBe(false);
  });
});
