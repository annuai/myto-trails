import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadFile } from "./upload-client";

const file = new File(["<gpx/>"], "ride.gpx", { type: "" });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("uploadFile", () => {
  it("requests a target, PUTs the file with the signed headers, then completes it", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url === "/api/uploads") return json({ uploadId: "u1", contentType: "application/gpx+xml", target: { url: "/api/storage/upload?t=x", method: "PUT", headers: { "Content-Type": "application/gpx+xml" } } }, 201);
      if (url === "/api/storage/upload?t=x") return new Response(null, { status: 200 });
      return json({ status: "ready", kind: "gpx", routeId: "r1" });
    }));
    const r = await uploadFile(file, "gpx");
    expect(r).toEqual({ ok: true, uploadId: "u1", outcome: { status: "ready", kind: "gpx", routeId: "r1" } });
    expect(JSON.parse(String(calls[0]!.init!.body))).toEqual({ kind: "gpx", contentType: "application/octet-stream", sizeBytes: file.size });
    expect(calls[1]!.init).toMatchObject({ method: "PUT", headers: { "Content-Type": "application/gpx+xml" } });
    expect(calls[2]!.url).toBe("/api/uploads/u1/complete");
  });

  it("explains a refused request, a failed PUT and a rejected file in words", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "Too many uploads. Try again later." }, 429)));
    expect(await uploadFile(file, "gpx")).toEqual({ ok: false, message: "Too many uploads. Try again later." });

    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url === "/api/uploads" ? json({ uploadId: "u", contentType: "x", target: { url: "/p", method: "PUT", headers: {} } }, 201) : new Response("no", { status: 500 }))));
    expect(await uploadFile(file, "gpx")).toMatchObject({ ok: false, message: expect.stringMatching(/upload/i) });

    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/uploads") return json({ uploadId: "u", contentType: "x", target: { url: "/p", method: "PUT", headers: {} } }, 201);
      if (url === "/p") return new Response(null, { status: 200 });
      return json({ status: "rejected", rejectMessage: "Only 1 track point found." });
    }));
    expect(await uploadFile(file, "gpx")).toEqual({ ok: false, message: "Only 1 track point found." });
  });

  it("survives a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    expect(await uploadFile(file, "gpx")).toMatchObject({ ok: false, message: expect.stringMatching(/connection/i) });
  });
});
