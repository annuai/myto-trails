import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto-box";

afterEach(() => vi.unstubAllEnvs());

describe("crypto-box", () => {
  it("round-trips a value, never contains the plaintext, and differs each time", () => {
    const a = encryptSecret("+919812345678");
    const b = encryptSecret("+919812345678");
    expect(a).not.toContain("9812345678");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("+919812345678");
  });
  it("rejects tampering, garbage and values made with another key", () => {
    vi.stubEnv("CONTACT_SECRET", "k".repeat(40));
    const sealed = encryptSecret("+919812345678");
    const parts = sealed.split(".");
    expect(decryptSecret([...parts.slice(0, 3), parts[3]!.slice(0, -2) + "AA"].join("."))).toBeNull();
    expect(decryptSecret("nonsense")).toBeNull();
    expect(decryptSecret("v1.a.b.c")).toBeNull();
    vi.stubEnv("CONTACT_SECRET", "z".repeat(40));
    expect(decryptSecret(sealed)).toBeNull();
  });
  it("requires a real secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONTACT_SECRET", "");
    expect(() => encryptSecret("+919812345678")).toThrow(/CONTACT_SECRET/);
    vi.stubEnv("CONTACT_SECRET", "short");
    expect(() => encryptSecret("+919812345678")).toThrow(/CONTACT_SECRET/);
    vi.stubEnv("CONTACT_SECRET", "s".repeat(32));
    expect(decryptSecret(encryptSecret("+919812345678"))).toBe("+919812345678");
  });
});
