// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ getSql: () => ({}) }));
vi.mock("@/server/storage", () => ({ getStorage: () => ({}) }));
const purge = vi.hoisted(() => vi.fn(async () => ({ purged: { sessions: 4 }, filesRemoved: 2, failed: [] as string[] })));
vi.mock("@/server/retention/purge", () => ({ purgeRetention: purge }));
vi.mock("next/server", () => ({ connection: async () => {} }));

import { GET } from "./route";

const url = "http://x/api/cron/purge-retention";
const SECRET = "s".repeat(32);

describe("purge retention cron", () => {
  it("refuses requests without the cron secret", async () => {
    process.env.CRON_SECRET = SECRET;
    expect((await GET(new Request(url))).status).toBe(401);
    expect((await GET(new Request(url, { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it("runs the purge and reports what it removed when the secret matches", async () => {
    process.env.CRON_SECRET = SECRET;
    const res = await GET(new Request(url, { headers: { authorization: `Bearer ${SECRET}` } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ purged: { sessions: 4 }, filesRemoved: 2, failed: [] });
  });

  it("is closed when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(new Request(url, { headers: { authorization: "Bearer undefined" } }))).status).toBe(401);
  });
});
