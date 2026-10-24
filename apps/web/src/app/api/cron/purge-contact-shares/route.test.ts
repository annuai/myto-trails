// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ getSql: () => ({}) }));
const purge = vi.hoisted(() => vi.fn(async () => 3));
vi.mock("@/server/community/questions", () => ({ purgeExpiredContactShares: purge }));
vi.mock("@/server/community/clubs", () => ({ purgeJoinPhones: async () => 2 }));
vi.mock("next/server", () => ({ connection: async () => {} }));

import { GET } from "./route";

const url = "http://x/api/cron/purge-contact-shares";
const SECRET = "s".repeat(32);

describe("purge contact shares cron", () => {
  it("refuses requests without the cron secret", async () => {
    process.env.CRON_SECRET = SECRET;
    expect((await GET(new Request(url))).status).toBe(401);
    expect((await GET(new Request(url, { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it("purges expired shares when the secret matches", async () => {
    process.env.CRON_SECRET = SECRET;
    const res = await GET(new Request(url, { headers: { authorization: `Bearer ${SECRET}` } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ purged: 3, clubPhonesPurged: 2 });
  });

  it("is closed when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(new Request(url, { headers: { authorization: "Bearer undefined" } }))).status).toBe(401);
  });
});
