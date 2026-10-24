import type { StorageBucket, StorageProvider } from "./types";

export type VerifyResult = { ok: true } | { ok: false; reason: "missing" | "too_large" | "size_mismatch" | "type_not_allowed" };

const baseType = (contentType: string) => contentType.split(";")[0]!.trim().toLowerCase();

/**
 * Providers cannot all bind size or type at signing time (Supabase cannot), so every upload is checked
 * after the fact. Anything that does not match what was promised is deleted.
 */
export async function verifyUpload(
  provider: StorageProvider,
  i: { bucket: StorageBucket; key: string; expectedSizeBytes: number; maxBytes: number; allowedContentTypes: string[] },
): Promise<VerifyResult> {
  const meta = await provider.head(i.bucket, i.key);
  if (!meta) return { ok: false, reason: "missing" };

  const fail = async (reason: "too_large" | "size_mismatch" | "type_not_allowed"): Promise<VerifyResult> => {
    await provider.remove(i.bucket, i.key);
    return { ok: false, reason };
  };

  if (meta.sizeBytes > i.maxBytes) return fail("too_large");
  if (meta.sizeBytes !== i.expectedSizeBytes) return fail("size_mismatch");
  if (!i.allowedContentTypes.map(baseType).includes(baseType(meta.contentType))) return fail("type_not_allowed");
  return { ok: true };
}
