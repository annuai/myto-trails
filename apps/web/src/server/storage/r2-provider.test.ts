import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildObjectKey } from "./keys";
import { createR2Provider } from "./r2-provider";
import { InvalidExpiryError, InvalidKeyError } from "./types";

const config = {
  provider: "r2" as const,
  accountId: "acc123",
  accessKeyId: "AKIAFAKEKEYID",
  secretAccessKey: "fake-secret-value",
  bucket: "trails-media",
  publicBaseUrl: "https://media.example.com",
};
const key = () => buildObjectKey({ kind: "gpx", ownerId: randomUUID(), objectId: randomUUID(), ext: "gpx" });

describe("R2 provider (offline)", () => {
  it("signs a PUT whose lifetime, type and length are bound", async () => {
    const provider = createR2Provider(config);
    const k = key();
    const target = await provider.createUploadUrl({
      bucket: "quarantine",
      key: k,
      contentType: "application/gpx+xml",
      sizeBytes: 1000,
      expiresInSeconds: 60,
    });
    const url = new URL(target.url);
    expect(target.method).toBe("PUT");
    expect(url.host).toBe("trails-media.acc123.r2.cloudflarestorage.com");
    expect(url.pathname).toBe(`/quarantine/${k}`);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("60");
    const signed = (url.searchParams.get("X-Amz-SignedHeaders") ?? "").split(";");
    expect(signed).toContain("content-type");
    expect(signed).toContain("content-length");
    expect(target.headers).toEqual({ "Content-Type": "application/gpx+xml", "Content-Length": "1000" });
  });

  it("does not add checksum parameters R2 cannot verify", async () => {
    const provider = createR2Provider(config);
    const target = await provider.createUploadUrl({
      bucket: "quarantine",
      key: key(),
      contentType: "image/webp",
      sizeBytes: 5,
      expiresInSeconds: 60,
    });
    expect(target.url).not.toMatch(/checksum/i);
  });

  it("signs a download that forces attachment with the given filename", async () => {
    const provider = createR2Provider(config);
    const url = new URL(await provider.createDownloadUrl({ bucket: "originals", key: key(), expiresInSeconds: 120, downloadFilename: "trail.gpx" }));
    const disposition = url.searchParams.get("response-content-disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("trail.gpx");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("120");
  });

  it("strips quotes, path separators and line breaks from download filenames", async () => {
    const provider = createR2Provider(config);
    const url = new URL(
      await provider.createDownloadUrl({ bucket: "originals", key: key(), expiresInSeconds: 60, downloadFilename: 'evil".gpx\r\nX-Injected: 1/../' }),
    );
    const disposition = url.searchParams.get("response-content-disposition") ?? "";
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition.match(/"/g)?.length).toBe(2);
    expect(disposition).not.toContain("/");
  });

  it("builds public URLs under the public prefix", () => {
    const k = `image/${randomUUID()}/${randomUUID()}.webp`;
    expect(createR2Provider(config).publicUrl(k)).toBe(`https://media.example.com/public/${k}`);
  });

  it("rejects unsafe keys and bad expiries before signing", async () => {
    const provider = createR2Provider(config);
    await expect(provider.head("quarantine", "../x")).rejects.toThrow(InvalidKeyError);
    await expect(provider.remove("quarantine", "/abs")).rejects.toThrow(InvalidKeyError);
    await expect(
      provider.createUploadUrl({ bucket: "quarantine", key: "a\\b", contentType: "application/gpx+xml", sizeBytes: 1, expiresInSeconds: 60 }),
    ).rejects.toThrow(InvalidKeyError);
    await expect(provider.createDownloadUrl({ bucket: "originals", key: key(), expiresInSeconds: 0 })).rejects.toThrow(InvalidExpiryError);
  });

  it("never exposes the secret when printed or serialised", () => {
    const provider = createR2Provider(config);
    expect(String(provider)).toBe("r2");
    expect(JSON.stringify(provider)).not.toContain("fake-secret-value");
    expect(JSON.stringify(provider)).not.toContain("AKIAFAKEKEYID");
  });
});
