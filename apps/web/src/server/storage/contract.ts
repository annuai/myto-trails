import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildObjectKey } from "./keys";
import { InvalidExpiryError, InvalidKeyError, type StorageBucket, type StorageProvider } from "./types";

type Harness = {
  provider: StorageProvider;
  upload: (bucket: StorageBucket, key: string, bytes: Uint8Array, contentType: string) => Promise<void>;
};

/** Behaviour every StorageProvider must share. Live providers run this only when STORAGE_TEST_LIVE=1. */
export function runStorageContract(name: string, make: () => Promise<Harness>): void {
  const freshKey = () => buildObjectKey({ kind: "gpx", ownerId: randomUUID(), objectId: randomUUID(), ext: "gpx" });

  describe(`storage contract: ${name}`, () => {
    it("head returns null for an unknown key", async () => {
      const { provider } = await make();
      expect(await provider.head("quarantine", freshKey())).toBeNull();
    });

    it("head reports size and content type after an upload", async () => {
      const { provider, upload } = await make();
      const key = freshKey();
      await upload("quarantine", key, new Uint8Array(123), "application/gpx+xml");
      expect(await provider.head("quarantine", key)).toEqual({ sizeBytes: 123, contentType: "application/gpx+xml" });
      await provider.remove("quarantine", key);
    });

    it("remove is idempotent", async () => {
      const { provider, upload } = await make();
      const key = freshKey();
      await upload("quarantine", key, new Uint8Array(10), "application/gpx+xml");
      await provider.remove("quarantine", key);
      await expect(provider.remove("quarantine", key)).resolves.toBeUndefined();
      expect(await provider.head("quarantine", key)).toBeNull();
    });

    it("issues an upload target that PUTs", async () => {
      const { provider } = await make();
      const target = await provider.createUploadUrl({
        bucket: "quarantine",
        key: freshKey(),
        contentType: "application/gpx+xml",
        sizeBytes: 100,
        expiresInSeconds: 60,
      });
      expect(target.method).toBe("PUT");
      expect(typeof target.url).toBe("string");
    });

    it("issues a download url", async () => {
      const { provider } = await make();
      const url = await provider.createDownloadUrl({ bucket: "originals", key: freshKey(), expiresInSeconds: 60, downloadFilename: "trail.gpx" });
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    });

    it("rejects unsafe keys before any I/O", async () => {
      const { provider } = await make();
      await expect(provider.head("quarantine", "../x")).rejects.toThrow(InvalidKeyError);
      await expect(
        provider.createUploadUrl({ bucket: "quarantine", key: "/abs", contentType: "application/gpx+xml", sizeBytes: 1, expiresInSeconds: 60 }),
      ).rejects.toThrow(InvalidKeyError);
      await expect(provider.remove("quarantine", "a\\b")).rejects.toThrow(InvalidKeyError);
    });

    it("rejects out-of-range expiries", async () => {
      const { provider } = await make();
      await expect(provider.createDownloadUrl({ bucket: "originals", key: freshKey(), expiresInSeconds: 5 })).rejects.toThrow(InvalidExpiryError);
      await expect(provider.createDownloadUrl({ bucket: "originals", key: freshKey(), expiresInSeconds: 86400 })).rejects.toThrow(InvalidExpiryError);
    });

    it("rejects a non-positive upload size", async () => {
      const { provider } = await make();
      await expect(
        provider.createUploadUrl({ bucket: "quarantine", key: freshKey(), contentType: "application/gpx+xml", sizeBytes: 0, expiresInSeconds: 60 }),
      ).rejects.toThrow(RangeError);
    });
  });
}
