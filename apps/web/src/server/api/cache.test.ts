// @vitest-environment node
import type { Sql } from "postgres";
import { describe, expect, it } from "vitest";
import { applyCachePolicy, PUBLIC_DAY_CACHE_CONTROL } from "./cache";
import { dispatch, ok, type Deps, type RouteDef } from "./http";
import { routes } from "./routes";

const body = () => new Response(JSON.stringify({ hello: "world" }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const tagOf = async () => (await applyCachePolicy(body(), { policy: "day", authed: false, ifNoneMatch: null })).headers.get("etag")!;

describe("applyCachePolicy", () => {
  it("day policy on a 200 sets the shared Cache-Control and an ETag", async () => {
    const r = await applyCachePolicy(body(), { policy: "day", authed: false, ifNoneMatch: null });
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe(PUBLIC_DAY_CACHE_CONTROL);
    expect(r.headers.get("etag")).toMatch(/^W\/"/);
    expect(await r.json()).toEqual({ hello: "world" });
  });

  it("worst case stays within 24 hours", () => {
    const n = (name: string) => Number(new RegExp(`${name}=(\\d+)`).exec(PUBLIC_DAY_CACHE_CONTROL)![1]);
    expect(n("s-maxage") + n("stale-while-revalidate")).toBeLessThanOrEqual(86400);
  });

  it("a matching If-None-Match gets 304 with no body", async () => {
    const tag = await tagOf();
    const r = await applyCachePolicy(body(), { policy: "day", authed: false, ifNoneMatch: tag });
    expect(r.status).toBe(304);
    expect(await r.text()).toBe("");
    expect(r.headers.get("etag")).toBe(tag);
    expect(r.headers.get("cache-control")).toBe(PUBLIC_DAY_CACHE_CONTROL);
  });

  it("a list of validators, weak or strong, still matches", async () => {
    const tag = await tagOf();
    const r = await applyCachePolicy(body(), { policy: "day", authed: false, ifNoneMatch: `W/"nope", ${tag.replace(/^W\//, "")}` });
    expect(r.status).toBe(304);
  });

  it("a different validator gets the full response", async () => {
    const r = await applyCachePolicy(body(), { policy: "day", authed: false, ifNoneMatch: 'W/"nope"' });
    expect(r.status).toBe(200);
  });

  it("a request with a token is private and has no ETag, even on a day route", async () => {
    const r = await applyCachePolicy(body(), { policy: "day", authed: true, ifNoneMatch: null });
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(r.headers.get("etag")).toBeNull();
  });

  it("errors are never stored publicly", async () => {
    const notFound = new Response("{}", { status: 404, headers: { "Cache-Control": "no-store" } });
    const r = await applyCachePolicy(notFound, { policy: "day", authed: false, ifNoneMatch: null });
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("etag")).toBeNull();
  });

  it("policy none leaves the response unchanged", async () => {
    const r = await applyCachePolicy(body(), { policy: "none", authed: false, ifNoneMatch: null });
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("etag")).toBeNull();
  });
});

describe("the route table", () => {
  it("every public GET route declares a cache policy", () => {
    const missing = routes.filter((r) => r.method === "GET" && r.access === "public" && r.cache === undefined).map((r) => r.path);
    expect(missing).toEqual([]);
  });

  it("no route that needs a token is cached", () => {
    expect(routes.filter((r) => r.access !== "public" && r.cache === "day").map((r) => r.path)).toEqual([]);
  });

  it("the cached set is exactly trails, trail, route, bikes, makes and the API description", () => {
    expect(routes.filter((r) => r.cache === "day").map((r) => r.path).sort()).toEqual(["/bikes", "/bikes/makes", "/openapi.json", "/trails", "/trails/{slug}", "/trails/{slug}/route"]);
  });
});

describe("dispatch applies the policy", () => {
  const sql = (async () => [{ ok: true }]) as unknown as Sql;
  const deps = { sql } as unknown as Deps;
  const fake: RouteDef[] = [{ method: "GET", path: "/thing", access: "public", summary: "t", cache: "day", handler: async () => ok({ a: 1 }) }];
  const get = (headers: Record<string, string> = {}) => dispatch(new Request("http://x/api/v1/thing", { headers }), fake, deps);

  it("serves the public header, then 304 for the same validator", async () => {
    const first = await get();
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe(PUBLIC_DAY_CACHE_CONTROL);
    const second = await get({ "if-none-match": first.headers.get("etag")! });
    expect(second.status).toBe(304);
  });
});
