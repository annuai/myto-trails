import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./tokens";

describe("tokens", () => {
  it("generates 256-bit URL-safe tokens that never repeat", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const t = generateToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
      seen.add(t);
    }
    expect(seen.size).toBe(200);
  });
  it("hashes deterministically to 64 hex characters and never returns the token", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toContain(t);
    expect(hashToken(t)).not.toBe(hashToken(`${t}x`));
  });
});
