// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dispatch, type Deps } from "./http";

const deps = { corsOrigins: ["http://localhost:8081"] } as unknown as Deps;
const preflight = (origin: string) => new Request("http://x/api/v1/trails", { method: "OPTIONS", headers: { origin, "access-control-request-method": "GET" } });

describe("CORS", () => {
  it("answers a preflight from a listed origin", async () => {
    const r = await dispatch(preflight("http://localhost:8081"), [], deps);
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("http://localhost:8081");
    expect(r.headers.get("access-control-allow-headers")).toContain("Authorization");
  });
  it("gives an unlisted origin nothing", async () => {
    const r = await dispatch(preflight("https://evil.example"), [], deps);
    expect(r.headers.get("access-control-allow-origin")).toBeNull();
  });
  it("always varies on Origin, so a shared cache never serves one origin's copy to another", async () => {
    const none = await dispatch(new Request("http://x/api/v1/nope"), [], deps);
    expect(none.headers.get("vary")).toContain("Origin");
    expect(none.headers.get("access-control-allow-origin")).toBeNull();
    const listed = await dispatch(new Request("http://x/api/v1/nope", { headers: { origin: "http://localhost:8081" } }), [], deps);
    expect(listed.headers.get("vary")?.match(/Origin/g)).toHaveLength(1);
  });
  it("adds the header to normal responses for a listed origin only", async () => {
    const ok = await dispatch(new Request("http://x/api/v1/nope", { headers: { origin: "http://localhost:8081" } }), [], deps);
    expect(ok.status).toBe(404);
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://localhost:8081");
    const no = await dispatch(new Request("http://x/api/v1/nope", { headers: { origin: "https://evil.example" } }), [], deps);
    expect(no.headers.get("access-control-allow-origin")).toBeNull();
  });
});
