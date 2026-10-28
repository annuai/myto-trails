// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn(async () => [{ ok: 1 }]));
vi.mock("@/server/db/client", () => ({ getSql: () => query }));
vi.mock("next/server", () => ({ connection: async () => {} }));

import { GET } from "./route";

const url = "http://x/api/cron/keepalive";
const SECRET = "s".repeat(32);
const authed = () => new Request(url, { headers: { authorization: `Bearer ${SECRET}` } });

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  query.mockClear();
});

describe("keepalive cron", () => {
  it("refuses requests without the cron secret and does not touch the database", async () => {
    process.env.CRON_SECRET = SECRET;
    expect((await GET(new Request(url))).status).toBe(401);
    expect((await GET(new Request(url, { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("queries the database and reports rest null when Supabase is not configured", async () => {
    process.env.CRON_SECRET = SECRET;
    const res = await GET(authed());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ db: true, rest: null });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("also calls the Supabase REST endpoint with the anon key when configured", async () => {
    process.env.CRON_SECRET = SECRET;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(authed());
    expect(await res.json()).toEqual({ db: true, rest: true });
    expect(fetchMock).toHaveBeenCalledWith("https://abc.supabase.co/rest/v1/", expect.objectContaining({ headers: { apikey: "anon-key" } }));
  });

  it("still succeeds when the REST call fails", async () => {
    process.env.CRON_SECRET = SECRET;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await (await GET(authed())).json()).toEqual({ db: true, rest: false });
  });
});
