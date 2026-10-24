import { describe } from "vitest";
import { loadServerEnv } from "../env";
import { runStorageContract } from "./contract";
import { createR2Provider } from "./r2-provider";

const live = process.env.STORAGE_TEST_LIVE === "1" && process.env.STORAGE_PROVIDER === "r2";

describe.skipIf(!live)("R2 provider (live, opt-in: npm run test:live)", () => {
  runStorageContract("r2", async () => {
    const storage = loadServerEnv(process.env).storage;
    if (storage.provider !== "r2") throw new Error("STORAGE_PROVIDER must be r2");
    const provider = createR2Provider(storage);
    return {
      provider,
      upload: async (bucket, key, bytes, contentType) => {
        const target = await provider.createUploadUrl({ bucket, key, contentType, sizeBytes: bytes.byteLength, expiresInSeconds: 60 });
        // fetch sets Content-Length itself from the body; it must equal the signed sizeBytes.
        const headers = { ...target.headers };
        delete headers["Content-Length"];
        const res = await fetch(target.url, { method: target.method, headers, body: new Blob([new Uint8Array(bytes)]) });
        if (!res.ok) throw new Error(`R2 upload failed with status ${res.status}`);
      },
    };
  });
});
