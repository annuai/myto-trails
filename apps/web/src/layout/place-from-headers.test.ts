import { describe, expect, it } from "vitest";
import { placeFromHeaders } from "./place-from-headers";

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

describe("placeFromHeaders", () => {
  it("combines the city and the country name", () => {
    expect(placeFromHeaders(h({ "x-vercel-ip-city": "Bengaluru", "x-vercel-ip-country": "IN" }))).toBe("Bengaluru, India");
    expect(placeFromHeaders(h({ "x-vercel-ip-city": "New%20Delhi", "x-vercel-ip-country": "IN" }))).toBe("New Delhi, India");
  });
  it("falls back to whichever part is known, or null", () => {
    expect(placeFromHeaders(h({ "x-vercel-ip-country": "IN" }))).toBe("India");
    expect(placeFromHeaders(h({ "x-vercel-ip-city": "Kochi" }))).toBe("Kochi");
    expect(placeFromHeaders(h({}))).toBeNull();
  });
  it("ignores malformed values", () => {
    expect(placeFromHeaders(h({ "x-vercel-ip-city": "%E0%A4%A", "x-vercel-ip-country": "India" }))).toBeNull();
    expect(placeFromHeaders(h({ "x-vercel-ip-city": "x".repeat(200), "x-vercel-ip-country": "IN" }))!.length).toBeLessThan(80);
  });
});
