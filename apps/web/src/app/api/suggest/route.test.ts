// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_DAY_CACHE_CONTROL } from "@/server/api/cache";

const suggest = vi.hoisted(() => vi.fn());
vi.mock("@/server/db/client", () => ({ getSql: () => ({}), withPublicRole: (_sql: unknown, fn: (tx: unknown) => unknown) => fn({}) }));
vi.mock("@/server/queries/search.sql", () => ({ suggest }));

import { GET } from "./route";

describe("GET /api/suggest", () => {
  beforeEach(() => {
    suggest.mockReset();
  });

  it("suggestions use the shared public cache header", async () => {
    suggest.mockResolvedValue({ trails: [], places: [], regions: [] });
    const r = await GET(new Request("http://x/api/suggest?q=goa"));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe(PUBLIC_DAY_CACHE_CONTROL);
  });

  it("a failure is never cached publicly", async () => {
    suggest.mockRejectedValue(new Error("db down"));
    const r = await GET(new Request("http://x/api/suggest?q=goa"));
    expect(r.status).toBe(503);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});
