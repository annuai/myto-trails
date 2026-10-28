// @vitest-environment node
import type { Sql } from "postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchTrails = vi.hoisted(() => vi.fn());
vi.mock("../db/client", () => ({ withPublicRole: (_sql: unknown, fn: (tx: unknown) => unknown) => fn({}) }));
vi.mock("../queries/search.sql", () => ({ searchTrails }));

import { dispatch, type Deps } from "./http";
import { routes } from "./routes";

const deps = { sql: (async () => [{ ok: true }]) as unknown as Sql, now: new Date() } as unknown as Deps;
const get = (qs: string) => dispatch(new Request(`http://x/api/v1/trails${qs}`), routes, deps);

describe("GET /api/v1/trails caching", () => {
  beforeEach(() => {
    searchTrails.mockReset();
    searchTrails.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, origin: null });
  });

  it("an ordinary search is shared-cacheable", async () => {
    const r = await get("?q=goa");
    expect(r.headers.get("cache-control")).toContain("s-maxage");
    expect(r.headers.get("etag")).not.toBeNull();
  });

  it("near me carries the rider's position, so it is private with no ETag", async () => {
    const r = await get("?near=me&lat=12.97&lon=77.59");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(r.headers.get("etag")).toBeNull();
  });
});
