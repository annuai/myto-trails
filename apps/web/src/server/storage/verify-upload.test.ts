import { describe, expect, it } from "vitest";
import { MemoryStorageProvider } from "./memory-provider";
import { verifyUpload } from "./verify-upload";

const key = "gpx/0b9f2d4e-6a1c-4b7e-8f3a-1c2d3e4f5a6b/7c1a9e20-3b4d-4f6a-9c8b-0d1e2f3a4b5c.gpx";
const MB = 1024 * 1024;
const base = { bucket: "quarantine" as const, key, allowedContentTypes: ["application/gpx+xml"] };

describe("verifyUpload", () => {
  it("reports a missing object", async () => {
    const p = new MemoryStorageProvider();
    expect(await verifyUpload(p, { ...base, expectedSizeBytes: 10, maxBytes: 5 * MB })).toEqual({ ok: false, reason: "missing" });
  });

  it("removes an object larger than the limit", async () => {
    const p = new MemoryStorageProvider();
    p.put("quarantine", key, new Uint8Array(6 * MB), "application/gpx+xml");
    expect(await verifyUpload(p, { ...base, expectedSizeBytes: 6 * MB, maxBytes: 5 * MB })).toEqual({ ok: false, reason: "too_large" });
    expect(await p.head("quarantine", key)).toBeNull();
  });

  it("removes an object whose size differs from what was promised", async () => {
    const p = new MemoryStorageProvider();
    p.put("quarantine", key, new Uint8Array(200), "application/gpx+xml");
    expect(await verifyUpload(p, { ...base, expectedSizeBytes: 100, maxBytes: 1000 })).toEqual({ ok: false, reason: "size_mismatch" });
    expect(await p.head("quarantine", key)).toBeNull();
  });

  it("removes an object with a disallowed content type", async () => {
    const p = new MemoryStorageProvider();
    p.put("quarantine", key, new Uint8Array(100), "application/zip");
    expect(await verifyUpload(p, { ...base, expectedSizeBytes: 100, maxBytes: 1000 })).toEqual({ ok: false, reason: "type_not_allowed" });
    expect(await p.head("quarantine", key)).toBeNull();
  });

  it("accepts a matching object and leaves it in place", async () => {
    const p = new MemoryStorageProvider();
    p.put("quarantine", key, new Uint8Array(100), "application/gpx+xml; charset=utf-8");
    expect(await verifyUpload(p, { ...base, expectedSizeBytes: 100, maxBytes: 1000 })).toEqual({ ok: true });
    expect(await p.head("quarantine", key)).not.toBeNull();
  });
});
