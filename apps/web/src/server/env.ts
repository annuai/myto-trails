import { z } from "zod";
import { getSiteUrl } from "@/lib/site";

type Source = Record<string, string | undefined>;

export type StorageConfig =
  | { provider: "memory" }
  | { provider: "local"; rootDir: string; secret: string }
  | {
      provider: "r2";
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
      publicBaseUrl: string;
    }
  | { provider: "supabase"; url: string; serviceRoleKey: string; bucketPrefix: string };

export type EmailConfig = { provider: "console" } | { provider: "resend"; apiKey: string; from: string };

export type ServerEnv = {
  siteUrl: string;
  storage: StorageConfig;
  email: EmailConfig;
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

const providerSchema = z.enum(["memory", "local", "r2", "supabase"]);
const emailProviderSchema = z.enum(["console", "resend"]);

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
  if (!parsed.success) throw new EnvError("STORAGE_PROVIDER must be one of memory, local, r2, supabase");

  switch (parsed.data) {
    case "memory":
      if (production) throw new EnvError("STORAGE_PROVIDER=memory is not allowed in production");
      return { provider: "memory" };
    case "local":
      if (production) throw new EnvError("STORAGE_PROVIDER=local is not allowed in production");
      return {
        provider: "local",
        rootDir: source.STORAGE_LOCAL_DIR?.trim() || ".storage",
        secret: source.STORAGE_LOCAL_SECRET?.trim() || "development-only-storage-secret",
      };
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

function loadEmail(source: Source): EmailConfig {
  // Stricter than isProduction: a Vercel preview also runs with NODE_ENV=production and may share a real database,
  // so the console sender (which prints live sign-in links into logs) is never allowed there.
  const production = source.NODE_ENV === "production";
  const raw = source.EMAIL_PROVIDER?.trim() || (production ? undefined : "console");
  if (!raw) throw new EnvError("Missing environment variables: EMAIL_PROVIDER", ["EMAIL_PROVIDER"]);
  const parsed = emailProviderSchema.safeParse(raw);
  if (!parsed.success) throw new EnvError("EMAIL_PROVIDER must be one of console, resend");
  if (parsed.data === "console") {
    if (production) throw new EnvError("EMAIL_PROVIDER=console is not allowed in production");
    return { provider: "console" };
  }
  const v = require(source, ["RESEND_API_KEY", "EMAIL_FROM"]);
  return { provider: "resend", apiKey: v.RESEND_API_KEY!, from: v.EMAIL_FROM! };
}

export function loadServerEnv(source: Source): ServerEnv {
  const siteUrl = getSiteUrl(source);
  const storage = loadStorage(source);
  if (isProduction(source) && !source.DATABASE_URL?.trim()) {
    throw new EnvError("Missing environment variables: DATABASE_URL", ["DATABASE_URL"]);
  }
  const email = loadEmail(source);
  return {
    siteUrl,
    storage,
    email,
    supabaseUrl: source.NEXT_PUBLIC_SUPABASE_URL || undefined,
    supabaseAnonKey: source.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    databaseUrl: source.DATABASE_URL || undefined,
  };
}

/** Just the database URL, for code that only needs the database (so unrelated settings are not validated). */
export function getDatabaseUrl(source: Source): string {
  const url = source.DATABASE_URL?.trim();
  if (!url) throw new EnvError("Missing environment variables: DATABASE_URL", ["DATABASE_URL"]);
  return url;
}

export function getPublicEnv(source: Source): { siteUrl: string; supabaseUrl?: string; supabaseAnonKey?: string } {
  return {
    siteUrl: getSiteUrl(source),
    supabaseUrl: source.NEXT_PUBLIC_SUPABASE_URL || undefined,
    supabaseAnonKey: source.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  };
}
