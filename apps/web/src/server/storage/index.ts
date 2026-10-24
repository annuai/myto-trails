import { loadServerEnv, type StorageConfig } from "../env";
import { MemoryStorageProvider } from "./memory-provider";
import type { StorageProvider } from "./types";

export * from "./types";
export { buildObjectKey, assertSafeKey, assertExpiry } from "./keys";
export { verifyUpload } from "./verify-upload";

export function createStorage(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case "memory":
      return new MemoryStorageProvider();
    case "r2":
    case "supabase":
      throw new Error(`Storage provider "${config.provider}" is not implemented yet`);
  }
}

let cached: StorageProvider | undefined;

/** Lazy singleton configured from the process environment. */
export function getStorage(): StorageProvider {
  cached ??= createStorage(loadServerEnv(process.env).storage);
  return cached;
}
