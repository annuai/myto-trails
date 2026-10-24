// End-to-end check of the configured storage provider. Run: npm run storage:smoke -w @moto-trails/web
// Prints PASS or FAIL with the failing step; never prints secrets.
import { randomUUID } from "node:crypto";
import { GPX_MAX_BYTES } from "@moto-trails/domain";
import { loadServerEnv } from "../src/server/env";
import { buildObjectKey, createStorage, verifyUpload } from "../src/server/storage";
import { LocalStorageProvider } from "../src/server/storage/local-provider";
import { MemoryStorageProvider } from "../src/server/storage/memory-provider";

const body = new TextEncoder().encode('<?xml version="1.0"?><gpx version="1.1" creator="smoke"/>');
const contentType = "application/gpx+xml";
let step = "start";

try {
  const provider = createStorage(loadServerEnv(process.env).storage);
  const key = buildObjectKey({ kind: "gpx", ownerId: randomUUID(), objectId: randomUUID(), ext: "gpx" });

  step = "create upload url";
  const target = await provider.createUploadUrl({ bucket: "quarantine", key, contentType, sizeBytes: body.byteLength, expiresInSeconds: 60 });

  step = "upload";
  if (provider instanceof MemoryStorageProvider) {
    provider.put("quarantine", key, body, contentType);
  } else if (provider instanceof LocalStorageProvider) {
    provider.writeObject("quarantine", key, body, contentType);
  } else {
    const headers = { ...target.headers };
    delete headers["Content-Length"];
    const res = await fetch(target.url, { method: target.method, headers, body: new Blob([body]) });
    if (!res.ok) throw new Error(`upload returned status ${res.status}`);
  }

  step = "verify upload";
  const verdict = await verifyUpload(provider, {
    bucket: "quarantine",
    key,
    expectedSizeBytes: body.byteLength,
    maxBytes: GPX_MAX_BYTES,
    allowedContentTypes: [contentType],
  });
  if (!verdict.ok) throw new Error(`verifyUpload failed: ${verdict.reason}`);

  step = "download";
  const downloadUrl = await provider.createDownloadUrl({ bucket: "quarantine", key, expiresInSeconds: 60, downloadFilename: "smoke.gpx" });
  if (!(provider instanceof MemoryStorageProvider) && !(provider instanceof LocalStorageProvider)) {
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`download returned status ${res.status}`);
    if ((await res.text()) !== new TextDecoder().decode(body)) throw new Error("downloaded content differs");
  }

  step = "remove";
  await provider.remove("quarantine", key);
  if ((await provider.head("quarantine", key)) !== null) throw new Error("object still present after remove");

  console.log(`PASS provider=${provider.name}`);
} catch (e) {
  console.error(`FAIL step="${step}": ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
