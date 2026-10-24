// @vitest-environment node
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { buildObjectKey } from "./keys";
import { createSupabaseProvider, ensureSupabaseBuckets } from "./supabase-provider";
import { InvalidExpiryError, InvalidKeyError } from "./types";

const config = { provider: "supabase" as const, url: "https://proj.supabase.co", serviceRoleKey: "service-role-secret", bucketPrefix: "trails" };
const key = () => buildObjectKey({ kind: "gpx", ownerId: randomUUID(), objectId: randomUUID(), ext: "gpx" });
const notFound = { message: "Object not found", status: 404, statusCode: "404" };

type Call = { bucket: string; method: string; args: unknown[] };

function stubClient(overrides: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const bucketsCreated: { name: string; isPublic: boolean }[] = [];
  const existingBuckets = new Set<string>((overrides.existingBuckets as string[]) ?? []);
  const api = (bucket: string) => ({
    createSignedUploadUrl: async (...args: unknown[]) => {
      calls.push({ bucket, method: "createSignedUploadUrl", args });
      return { data: { signedUrl: `https://proj.supabase.co/storage/v1/object/upload/sign/${bucket}/x?token=t`, token: "t", path: "x" }, error: null };
    },
    createSignedUrl: async (...args: unknown[]) => {
      calls.push({ bucket, method: "createSignedUrl", args });
      return { data: { signedUrl: `https://proj.supabase.co/storage/v1/object/sign/${bucket}/x?token=d` }, error: null };
    },
    info: async (...args: unknown[]) => {
      calls.push({ bucket, method: "info", args });
      return (overrides.info as () => unknown)?.() ?? { data: null, error: notFound };
    },
    download: async (...args: unknown[]) => {
      calls.push({ bucket, method: "download", args });
      return (overrides.download as () => unknown)?.() ?? { data: null, error: notFound };
    },
    remove: async (...args: unknown[]) => {
      calls.push({ bucket, method: "remove", args });
      return { data: [], error: null };
    },
  });
  const client = {
    storage: {
      from: api,
      getBucket: async (name: string) => (existingBuckets.has(name) ? { data: { name }, error: null } : { data: null, error: notFound }),
      createBucket: async (name: string, opts: { public: boolean }) => {
        bucketsCreated.push({ name, isPublic: opts.public });
        return { data: { name }, error: null };
      },
    },
  } as unknown as SupabaseClient;
  return { client, calls, bucketsCreated };
}

describe("Supabase provider (offline)", () => {
  it("maps logical buckets to prefixed Supabase buckets for uploads", async () => {
    const { client, calls } = stubClient();
    const provider = createSupabaseProvider(config, client);
    const k = key();
    const target = await provider.createUploadUrl({ bucket: "quarantine", key: k, contentType: "application/gpx+xml", sizeBytes: 100, expiresInSeconds: 60 });
    expect(calls).toEqual([{ bucket: "trails-quarantine", method: "createSignedUploadUrl", args: [k] }]);
    expect(target.method).toBe("PUT");
    expect(target.url).toContain("token=t");
    expect(target.headers["Content-Type"]).toBe("application/gpx+xml");
    expect(target.headers["x-upsert"]).toBe("false");
  });

  it("honours a custom bucket prefix", async () => {
    const { client, calls } = stubClient();
    const provider = createSupabaseProvider({ ...config, bucketPrefix: "dev" }, client);
    await provider.createDownloadUrl({ bucket: "originals", key: key(), expiresInSeconds: 120 });
    expect(calls[0]?.bucket).toBe("dev-originals");
  });

  it("creates a download url with the sanitised filename", async () => {
    const { client, calls } = stubClient();
    const provider = createSupabaseProvider(config, client);
    const k = key();
    const url = await provider.createDownloadUrl({ bucket: "originals", key: k, expiresInSeconds: 120, downloadFilename: 'a"b/trail.gpx' });
    expect(url).toContain("token=d");
    expect(calls[0]).toEqual({ bucket: "trails-originals", method: "createSignedUrl", args: [k, 120, { download: "abtrail.gpx" }] });
  });

  it("builds public URLs on the public bucket", () => {
    const { client } = stubClient();
    const k = `image/${randomUUID()}/${randomUUID()}.webp`;
    expect(createSupabaseProvider(config, client).publicUrl(k)).toBe(`https://proj.supabase.co/storage/v1/object/public/trails-public/${k}`);
  });

  it("head returns null when the object is not found", async () => {
    const { client } = stubClient();
    expect(await createSupabaseProvider(config, client).head("quarantine", key())).toBeNull();
  });

  it("head returns size and content type when found", async () => {
    const { client } = stubClient({ info: () => ({ data: { size: 321, contentType: "application/gpx+xml" }, error: null }) });
    expect(await createSupabaseProvider(config, client).head("quarantine", key())).toEqual({ sizeBytes: 321, contentType: "application/gpx+xml" });
  });

  it("head rethrows errors that are not 'not found'", async () => {
    const { client } = stubClient({ info: () => ({ data: null, error: { message: "boom", status: 500, statusCode: "500" } }) });
    await expect(createSupabaseProvider(config, client).head("quarantine", key())).rejects.toThrow("boom");
  });

  it("get returns the bytes, null when not found, and rethrows other errors", async () => {
    const ok = stubClient({ download: () => ({ data: new Blob([Uint8Array.from([1, 2, 3])]), error: null }) });
    expect(Array.from((await createSupabaseProvider(config, ok.client).get("quarantine", key()))!)).toEqual([1, 2, 3]);
    expect(await createSupabaseProvider(config, stubClient().client).get("quarantine", key())).toBeNull();
    const bad = stubClient({ download: () => ({ data: null, error: { message: "boom", status: 500, statusCode: "500" } }) });
    await expect(createSupabaseProvider(config, bad.client).get("quarantine", key())).rejects.toThrow("boom");
  });

  it("rejects unsafe keys and bad expiries without calling Supabase", async () => {
    const { client, calls } = stubClient();
    const provider = createSupabaseProvider(config, client);
    await expect(provider.head("quarantine", "../x")).rejects.toThrow(InvalidKeyError);
    await expect(provider.remove("quarantine", "/abs")).rejects.toThrow(InvalidKeyError);
    await expect(provider.createDownloadUrl({ bucket: "originals", key: key(), expiresInSeconds: 3601 })).rejects.toThrow(InvalidExpiryError);
    expect(calls).toEqual([]);
  });

  it("never exposes the service role key when printed or serialised", () => {
    const { client } = stubClient();
    const provider = createSupabaseProvider(config, client);
    expect(String(provider)).toBe("supabase");
    expect(JSON.stringify(provider)).not.toContain("service-role-secret");
  });
});

describe("ensureSupabaseBuckets", () => {
  it("creates only the missing buckets, with only the public one public", async () => {
    const { client, bucketsCreated } = stubClient({ existingBuckets: ["trails-originals"] });
    await ensureSupabaseBuckets(config, client);
    expect(bucketsCreated).toEqual([
      { name: "trails-quarantine", isPublic: false },
      { name: "trails-public", isPublic: true },
    ]);
  });
});
