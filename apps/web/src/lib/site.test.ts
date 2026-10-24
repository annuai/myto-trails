import { describe, expect, it } from "vitest";
import { getSiteUrl } from "./site";

describe("getSiteUrl", () => {
  it("strips the trailing slash", () => {
    expect(getSiteUrl({ SITE_URL: "https://moto-trails.com/" })).toBe("https://moto-trails.com");
  });
  it("defaults to localhost outside production", () => {
    expect(getSiteUrl({ NODE_ENV: "development" })).toBe("http://localhost:3000");
  });
  it("throws in production when unset", () => {
    expect(() => getSiteUrl({ NODE_ENV: "production" })).toThrow(/SITE_URL/);
  });
  it("throws in production when not https", () => {
    expect(() => getSiteUrl({ NODE_ENV: "production", SITE_URL: "http://x.com" })).toThrow(/https/);
  });
  it("uses the Vercel deployment host for previews when SITE_URL is unset", () => {
    expect(getSiteUrl({ NODE_ENV: "production", VERCEL_URL: "myto-trails-git-x.vercel.app" })).toBe(
      "https://myto-trails-git-x.vercel.app",
    );
  });
  it("prefers SITE_URL over the Vercel host", () => {
    expect(getSiteUrl({ NODE_ENV: "production", SITE_URL: "https://moto-trails.com", VERCEL_URL: "x.vercel.app" })).toBe(
      "https://moto-trails.com",
    );
  });
});
