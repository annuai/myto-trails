import { z } from "zod";
import { getSiteUrl } from "@/lib/site";

type Source = Record<string, string | undefined>;

export type StorageConfig =
  | { provider: "memory" }
  | {
      provider: "r2";
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
      publicBaseUrl: string;
    }
  | { provider: "supabase"; url: string; serviceRoleKey: string; bucketPrefix: string };

export type ServerEnv = {
  siteUrl: string;
  storage: StorageConfig;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  databaseUrl?: string;
};

/** Thrown for bad configuration. Messages name variables only, never values. */
export class EnvError extends Error {
  constructor(
    message: string,
    readonly missing: string[] = [],
  ) {
    super(message);
    this.name = "EnvError";
  }
}

const providerSchema = z.enum(["memory", "r2", "supabase"]);

function require(source: Source, names: string[]): Record<string, string> {
  const missing = names.filter((n) => !source[n]?.trim());
  if (missing.length) throw new EnvError(`Missing environment variables: ${missing.join(", ")}`, missing);
  return Object.fromEntries(names.map((n) => [n, source[n]!.trim()]));
}

/** Vercel preview deployments run with NODE_ENV=production but are not production. */
function isProduction(source: Source): boolean {
  return source.NODE_ENV === "production" && source.VERCEL_ENV !== "preview";
}

function loadStorage(source: Source): StorageConfig {
  const production = isProduction(source);
  const raw = source.STORAGE_PROVIDER?.trim() || (production ? undefined : "memory");
  if (!raw) throw new EnvError("Missing environment variables: STORAGE_PROVIDER", ["STORAGE_PROVIDER"]);

  const parsed = providerSchema.safeParse(raw);
  if (!parsed.success) throw new EnvError("STORAGE_PROVIDER must be one of memory, r2, supabase");

  switch (parsed.data) {
    case "memory":
      if (production) throw new EnvError("STORAGE_PROVIDER=memory is not allowed in production");
      return { provider: "memory" };
    case "r2": {
      const v = require(source, ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"]);
      return {
        provider: "r2",
        accountId: v.R2_ACCOUNT_ID!,
        accessKeyId: v.R2_ACCESS_KEY_ID!,
        secretAccessKey: v.R2_SECRET_ACCESS_KEY!,
        bucket: v.R2_BUCKET!,
        publicBaseUrl: v.R2_PUBLIC_BASE_URL!.replace(/\/+$/, ""),
      };
    }
    case "supabase": {
      const v = require(source, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
      return {
        provider: "supabase",
        url: v.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey: v.SUPABASE_SERVICE_ROLE_KEY!,
        bucketPrefix: source.SUPABASE_STORAGE_BUCKET_PREFIX?.trim() || "trails",
      };
    }
  }
}

export function loadServerEnv(source: Source): ServerEnv {
  const siteUrl = getSiteUrl(source);
  const storage = loadStorage(source);
  if (isProduction(source) && !source.DATABASE_URL?.trim()) {
    throw new EnvError("Missing environment variables: DATABASE_URL", ["DATABASE_URL"]);
  }
  return {
    siteUrl,
    storage,
    supabaseUrl: source.NEXT_PUBLIC_SUPABASE_URL || undefined,
    supabaseAnonKey: source.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    databaseUrl: source.DATABASE_URL || undefined,
  };
}

export function getPublicEnv(source: Source): { siteUrl: string; supabaseUrl?: string; supabaseAnonKey?: string } {
  return {
    siteUrl: getSiteUrl(source),
    supabaseUrl: source.NEXT_PUBLIC_SUPABASE_URL || undefined,
    supabaseAnonKey: source.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  };
}
