import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./same-origin";

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

describe("isSameOrigin", () => {
  it("accepts a matching origin and requests with no origin", () => {
    expect(isSameOrigin(h({ origin: "https://moto-trails.com", host: "moto-trails.com" }))).toBe(true);
    expect(isSameOrigin(h({ host: "moto-trails.com" }))).toBe(true);
  });
  it("prefers the forwarded host", () => {
    expect(isSameOrigin(h({ origin: "https://moto-trails.com", host: "internal:3000", "x-forwarded-host": "moto-trails.com" }))).toBe(true);
  });
  it("refuses another site, a different port, and garbage", () => {
    expect(isSameOrigin(h({ origin: "https://evil.example", host: "moto-trails.com" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "http://localhost:3001", host: "localhost:3000" }))).toBe(false);
    expect(isSameOrigin(h({ origin: "null", host: "moto-trails.com" }))).toBe(false);
  });
});
