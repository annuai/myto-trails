// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ getSql: () => ({}) }));
vi.mock("@/server/auth/session", () => ({ getEmailSender: () => ({}) }));
const sweep = vi.hoisted(() => vi.fn(async () => ({ notified: 2, wiped: 1 })));
vi.mock("@/server/rides/checkins", () => ({ sweepCheckins: sweep }));
vi.mock("@/server/rides/group-rides", () => ({ sweepGroupRides: async () => 4 }));
vi.mock("next/server", () => ({ connection: async () => {} }));

import { GET } from "./route";

const url = "http://x/api/cron/checkins";
const SECRET = "s".repeat(32);

describe("check-ins cron", () => {
  it("refuses requests without the cron secret, and does nothing", async () => {
    process.env.CRON_SECRET = SECRET;
    expect((await GET(new Request(url))).status).toBe(401);
    expect((await GET(new Request(url, { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    expect(sweep).not.toHaveBeenCalled();
  });

  it("sweeps check-ins and group rides when the secret matches", async () => {
    process.env.CRON_SECRET = SECRET;
    const res = await GET(new Request(url, { headers: { authorization: `Bearer ${SECRET}` } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ notified: 2, wiped: 1, groupRidesEnded: 4 });
  });

  it("is closed when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(new Request(url, { headers: { authorization: "Bearer undefined" } }))).status).toBe(401);
  });
});
