// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ getSql: () => ({}) }));
const minutes = vi.hoisted(() => vi.fn<() => Promise<number | null>>());
vi.mock("@/server/api/heartbeat", () => ({ minutesSinceHeartbeat: minutes }));
vi.mock("next/server", () => ({ connection: async () => {} }));

import { GET } from "./route";

const SECRET = "s".repeat(32);
const call = () => GET(new Request("http://x/api/cron/watchdog", { headers: { authorization: `Bearer ${SECRET}` } }));

describe("sweep watchdog", () => {
  it("is closed without the cron secret", async () => {
    process.env.CRON_SECRET = SECRET;
    expect((await GET(new Request("http://x/api/cron/watchdog"))).status).toBe(401);
  });

  it("is healthy when the sweep finished recently", async () => {
    process.env.CRON_SECRET = SECRET;
    minutes.mockResolvedValueOnce(12);
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, minutesSinceSweep: 12 });
  });

  it("fails when the sweep is stale or has never run", async () => {
    process.env.CRON_SECRET = SECRET;
    minutes.mockResolvedValueOnce(90);
    expect((await call()).status).toBe(503);
    minutes.mockResolvedValueOnce(null);
    expect((await call()).status).toBe(503);
  });
});
