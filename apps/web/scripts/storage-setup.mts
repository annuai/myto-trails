// Creates the storage buckets for the configured provider. Run: npm run storage:setup -w @moto-trails/web
import { loadServerEnv } from "../src/server/env";
import { ensureSupabaseBuckets } from "../src/server/storage/supabase-provider";

const { storage } = loadServerEnv(process.env);

switch (storage.provider) {
  case "memory":
    console.log("provider=memory: nothing to set up.");
    break;
  case "r2":
    console.log("provider=r2: create the R2 bucket in the Cloudflare dashboard; logical buckets are key prefixes, so nothing else to set up.");
    break;
  case "supabase":
    await ensureSupabaseBuckets(storage);
    console.log(`provider=supabase: buckets ensured (${storage.bucketPrefix}-quarantine, -originals, -public).`);
    break;
}
