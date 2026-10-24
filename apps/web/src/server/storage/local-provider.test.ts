import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { runStorageContract } from "./contract";
import { LocalStorageProvider } from "./local-provider";
import { buildObjectKey } from "./keys";
import { randomUUID } from "node:crypto";

const root = mkdtempSync(join(tmpdir(), "mt-storage-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const make = () => new LocalStorageProvider({ rootDir: root, secret: "test-secret" });
const key = () => buildObjectKey({ kind: "gpx", ownerId: randomUUID(), objectId: randomUUID(), ext: "gpx" });

runStorageContract("local", async () => {
  const provider = make();
  return { provider, upload: async (b, k, bytes, type) => provider.writeObject(b, k, bytes, type) };
});

describe("local provider signed uploads", () => {
  const body = new TextEncoder().encode("<gpx/>");

  async function target(p: LocalStorageProvider, k: string, over: { contentType?: string; sizeBytes?: number; expiresInSeconds?: number } = {}) {
    const t = await p.createUploadUrl({ bucket: "quarantine", key: k, contentType: over.contentType ?? "application/gpx+xml", sizeBytes: over.sizeBytes ?? body.byteLength, expiresInSeconds: over.expiresInSeconds ?? 60 });
    return new URL(t.url, "http://x").searchParams.get("t")!;
  }

  it("accepts a PUT that matches the signed key, type and size, and stores it", async () => {
    const p = make();
    const k = key();
    expect(await p.handlePut(await target(p, k), "application/gpx+xml", body)).toEqual({ ok: true });
    expect(await p.head("quarantine", k)).toEqual({ sizeBytes: body.byteLength, contentType: "application/gpx+xml" });
  });

  it("rejects a different content type or size than was signed", async () => {
    const p = make();
    const k = key();
    expect(await p.handlePut(await target(p, k), "application/zip", body)).toMatchObject({ ok: false, status: 400 });
    expect(await p.handlePut(await target(p, k), "application/gpx+xml", new Uint8Array(body.byteLength + 1))).toMatchObject({ ok: false, status: 400 });
    expect(await p.head("quarantine", k)).toBeNull();
  });

  it("rejects tampered, foreign-secret, malformed and expired tokens", async () => {
    const p = make();
    const k = key();
    const good = await target(p, k);
    const [payload, sig] = good.split(".") as [string, string];
    expect(await p.handlePut(`${payload}.${sig.slice(0, -2)}xx`, "application/gpx+xml", body)).toMatchObject({ ok: false, status: 403 });
    expect(await p.handlePut(`${Buffer.from("{}").toString("base64url")}.${sig}`, "application/gpx+xml", body)).toMatchObject({ ok: false, status: 403 });
    expect(await p.handlePut("not-a-token", "application/gpx+xml", body)).toMatchObject({ ok: false, status: 403 });
    expect(await p.handlePut("", "application/gpx+xml", body)).toMatchObject({ ok: false, status: 403 });
    const other = new LocalStorageProvider({ rootDir: root, secret: "another-secret" });
    expect(await other.handlePut(good, "application/gpx+xml", body)).toMatchObject({ ok: false, status: 403 });
    const expired = await target(p, key(), { expiresInSeconds: 30 });
    const realNow = Date.now;
    Date.now = () => realNow() + 31_000;
    try {
      expect(await p.handlePut(expired, "application/gpx+xml", body)).toMatchObject({ ok: false, status: 403 });
    } finally {
      Date.now = realNow;
    }
  });

  it("cannot use a download token to upload, or an upload token to download", async () => {
    const p = make();
    const k = key();
    p.writeObject("originals", k, body, "application/gpx+xml");
    const dl = new URL(await p.createDownloadUrl({ bucket: "originals", key: k, expiresInSeconds: 60 }), "http://x").searchParams.get("t")!;
    expect(await p.handlePut(dl, "application/gpx+xml", body)).toMatchObject({ ok: false, status: 403 });
    expect(await p.handleGet(await target(p, key()))).toMatchObject({ ok: false, status: 403 });
  });
});

describe("local provider signed downloads", () => {
  it("serves the stored bytes with an attachment filename", async () => {
    const p = make();
    const k = key();
    p.writeObject("originals", k, new TextEncoder().encode("hello"), "text/plain");
    const token = new URL(await p.createDownloadUrl({ bucket: "originals", key: k, expiresInSeconds: 60, downloadFilename: 'a"b.gpx' }), "http://x").searchParams.get("t")!;
    const r = await p.handleGet(token);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(new TextDecoder().decode(r.body)).toBe("hello");
      expect(r.contentType).toBe("text/plain");
      expect(r.contentDisposition).toMatch(/^attachment; filename="[^"\r\n]*"$/);
      expect(r.contentDisposition).not.toContain('a"b');
    }
  });
  it("returns 404 for a valid token whose object is gone", async () => {
    const p = make();
    const token = new URL(await p.createDownloadUrl({ bucket: "originals", key: key(), expiresInSeconds: 60 }), "http://x").searchParams.get("t")!;
    expect(await p.handleGet(token)).toMatchObject({ ok: false, status: 404 });
  });
});

describe("local provider public files", () => {
  it("serves only the public bucket and only safe keys", async () => {
    const p = make();
    const k = `image/${randomUUID()}/${randomUUID()}-800.webp`;
    p.writeObject("public", k, new Uint8Array([1, 2, 3]), "image/webp");
    expect(p.publicUrl(k)).toBe(`/api/storage/public/${k}`);
    expect(await p.readPublic(k)).toMatchObject({ ok: true, contentType: "image/webp" });
    p.writeObject("originals", k, new Uint8Array([9]), "image/webp");
    expect(await p.readPublic("../../etc/passwd")).toMatchObject({ ok: false, status: 400 });
    expect(await p.readPublic(`image/${randomUUID()}/missing.webp`)).toMatchObject({ ok: false, status: 404 });
  });
  it("never reads outside its root", async () => {
    const p = make();
    for (const bad of ["../x", "a/../../b", "/etc/passwd", "a\\b"]) await expect(p.head("quarantine", bad)).rejects.toThrow();
  });
});
