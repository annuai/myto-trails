import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "./instrumentation";

afterEach(() => vi.unstubAllEnvs());

describe("instrumentation register", () => {
  it("fails at server start when production uses the memory provider", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "https://moto-trails.com");
    vi.stubEnv("STORAGE_PROVIDER", "memory");
    await expect(register()).rejects.toThrow(/memory/);
  });

  it("fails at server start when r2 is selected without its variables", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SITE_URL", "https://moto-trails.com");
    vi.stubEnv("STORAGE_PROVIDER", "r2");
    await expect(register()).rejects.toThrow(/R2_ACCOUNT_ID/);
  });

  it("passes with a valid development configuration", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "development");
    await expect(register()).resolves.toBeUndefined();
  });
});
