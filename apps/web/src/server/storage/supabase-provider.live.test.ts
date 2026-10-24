import { describe } from "vitest";
import { loadServerEnv } from "../env";
import { runStorageContract } from "./contract";
import { createSupabaseProvider, ensureSupabaseBuckets } from "./supabase-provider";

const live = process.env.STORAGE_TEST_LIVE === "1" && process.env.STORAGE_PROVIDER === "supabase";

describe.skipIf(!live)("Supabase provider (live, opt-in: npm run test:live)", () => {
  runStorageContract("supabase", async () => {
    const storage = loadServerEnv(process.env).storage;
    if (storage.provider !== "supabase") throw new Error("STORAGE_PROVIDER must be supabase");
    await ensureSupabaseBuckets(storage);
    const provider = createSupabaseProvider(storage);
    return {
      provider,
      upload: async (bucket, key, bytes, contentType) => {
        const target = await provider.createUploadUrl({ bucket, key, contentType, sizeBytes: bytes.byteLength, expiresInSeconds: 60 });
        // The returned target must work with a plain fetch: raw body, content type and x-upsert headers.
        const res = await fetch(target.url, { method: target.method, headers: target.headers, body: new Blob([new Uint8Array(bytes)]) });
        if (!res.ok) throw new Error(`Supabase upload failed with status ${res.status}`);
      },
    };
  });
});
