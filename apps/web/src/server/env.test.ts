import { describe, expect, it } from "vitest";
import { EnvError, getDatabaseUrl, getPublicEnv, loadServerEnv } from "./env";

const r2 = {
  R2_ACCOUNT_ID: "acc",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "s3cr3t-value",
  R2_BUCKET: "bucket",
  R2_PUBLIC_BASE_URL: "https://media.example.com",
};

describe("loadServerEnv", () => {
  it("defaults to the memory provider in development", () => {
    const env = loadServerEnv({ NODE_ENV: "development" });
    expect(env.storage).toEqual({ provider: "memory" });
    expect(env.siteUrl).toBe("http://localhost:3000");
  });

  it("reads a complete r2 configuration", () => {
    const env = loadServerEnv({ NODE_ENV: "development", STORAGE_PROVIDER: "r2", ...r2 });
    expect(env.storage).toEqual({
      provider: "r2",
      accountId: "acc",
      accessKeyId: "key",
      secretAccessKey: "s3cr3t-value",
      bucket: "bucket",
      publicBaseUrl: "https://media.example.com",
    });
  });

  it("reports every missing r2 variable by name", () => {
    try {
      loadServerEnv({ NODE_ENV: "development", STORAGE_PROVIDER: "r2" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError);
      expect((e as EnvError).missing).toEqual([
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET",
        "R2_PUBLIC_BASE_URL",
      ]);
    }
  });

  it("never puts a supplied secret in the error message", () => {
    try {
      loadServerEnv({ NODE_ENV: "development", STORAGE_PROVIDER: "r2", R2_SECRET_ACCESS_KEY: "s3cr3t-value" });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toContain("R2_ACCOUNT_ID");
      expect((e as Error).message).not.toContain("s3cr3t-value");
    }
  });

  it("reads a supabase storage configuration with the default bucket prefix", () => {
    const env = loadServerEnv({
      NODE_ENV: "development",
      STORAGE_PROVIDER: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: "https://p.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    });
    expect(env.storage).toEqual({
      provider: "supabase",
      url: "https://p.supabase.co",
      serviceRoleKey: "service-key",
      bucketPrefix: "trails",
    });
  });

  it("rejects the memory provider in production", () => {
    expect(() => loadServerEnv({ NODE_ENV: "production", SITE_URL: "https://moto-trails.com", STORAGE_PROVIDER: "memory" })).toThrow(
      /memory/,
    );
  });

  it("allows the memory provider in a Vercel preview deployment", () => {
    const env = loadServerEnv({ NODE_ENV: "production", VERCEL_ENV: "preview", VERCEL_URL: "x.vercel.app" });
    expect(env.storage).toEqual({ provider: "memory" });
  });

  it("requires DATABASE_URL in production", () => {
    try {
      loadServerEnv({ NODE_ENV: "production", SITE_URL: "https://moto-trails.com", STORAGE_PROVIDER: "r2", ...r2 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError);
      expect((e as EnvError).missing).toEqual(["DATABASE_URL"]);
    }
  });

  it("accepts a production configuration that includes DATABASE_URL", () => {
    const env = loadServerEnv({
      NODE_ENV: "production",
      SITE_URL: "https://moto-trails.com",
      STORAGE_PROVIDER: "r2",
      DATABASE_URL: "postgres://u:p@h/db",
      ...r2,
    });
    expect(env.databaseUrl).toBe("postgres://u:p@h/db");
  });

  it("requires a provider in production", () => {
    expect(() => loadServerEnv({ NODE_ENV: "production", SITE_URL: "https://moto-trails.com" })).toThrow(/STORAGE_PROVIDER/);
  });

  it("rejects an unknown provider without echoing the value", () => {
    try {
      loadServerEnv({ NODE_ENV: "development", STORAGE_PROVIDER: "hunter2-nope" });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/memory, r2, supabase/);
      expect((e as Error).message).not.toContain("hunter2-nope");
    }
  });
});

describe("getPublicEnv", () => {
  it("exposes only public values", () => {
    const pub = getPublicEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "https://p.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
      ...r2,
    });
    const json = JSON.stringify(pub);
    expect(pub).toEqual({ siteUrl: "http://localhost:3000", supabaseUrl: "https://p.supabase.co", supabaseAnonKey: "anon" });
    expect(json).not.toContain("service-key");
    expect(json).not.toContain("s3cr3t-value");
  });
});

describe("getDatabaseUrl", () => {
  it("returns DATABASE_URL without validating unrelated settings", () => {
    expect(getDatabaseUrl({ NODE_ENV: "production", STORAGE_PROVIDER: "memory", DATABASE_URL: "postgres://u:p@h/db" })).toBe("postgres://u:p@h/db");
  });
  it("names DATABASE_URL when it is missing and never echoes other values", () => {
    try {
      getDatabaseUrl({ R2_SECRET_ACCESS_KEY: "s3cr3t-value" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError);
      expect((e as EnvError).missing).toEqual(["DATABASE_URL"]);
      expect((e as Error).message).not.toContain("s3cr3t-value");
    }
  });
});
