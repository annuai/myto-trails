import { describe, expect, it } from "vitest";
import { getAppDownloadUrl, getBetaApk, getSiteUrl, getWaitlistUrl } from "./site";

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
    expect(getSiteUrl({ NODE_ENV: "production", VERCEL_ENV: "preview", VERCEL_URL: "myto-trails-git-x.vercel.app" })).toBe(
      "https://myto-trails-git-x.vercel.app",
    );
  });
  it("prefers SITE_URL over the Vercel host", () => {
    expect(getSiteUrl({ NODE_ENV: "production", SITE_URL: "https://moto-trails.com", VERCEL_URL: "x.vercel.app" })).toBe(
      "https://moto-trails.com",
    );
  });
  it("does not fall back to the deployment host in a Vercel production deploy", () => {
    expect(() => getSiteUrl({ NODE_ENV: "production", VERCEL_ENV: "production", VERCEL_URL: "x.vercel.app" })).toThrow(/SITE_URL/);
  });
});

describe("getAppDownloadUrl", () => {
  it("is the https address when set, and nothing when unset, blank, or not https", () => {
    expect(getAppDownloadUrl({ APP_DOWNLOAD_URL: " https://testflight.apple.com/join/abc " })).toBe("https://testflight.apple.com/join/abc");
    expect(getAppDownloadUrl({})).toBeUndefined();
    expect(getAppDownloadUrl({ APP_DOWNLOAD_URL: "  " })).toBeUndefined();
    expect(getAppDownloadUrl({ APP_DOWNLOAD_URL: "http://example.com/app" })).toBeUndefined();
    expect(getAppDownloadUrl({ APP_DOWNLOAD_URL: "javascript:alert(1)" })).toBeUndefined();
  });
});

describe("getBetaApk", () => {
  it("needs an https link, and fills in a version and size", () => {
    expect(getBetaApk({})).toBeUndefined();
    expect(getBetaApk({ APP_BETA_APK_URL: "http://x.com/a.apk" })).toBeUndefined();
    expect(getBetaApk({ APP_BETA_APK_URL: "not a url" })).toBeUndefined();
    expect(getBetaApk({ APP_BETA_APK_URL: "https://x.com/a.apk" })).toEqual({ url: "https://x.com/a.apk", version: "0.10", size: "60 MB" });
    expect(getBetaApk({ APP_BETA_APK_URL: "https://x.com/a.apk", APP_BETA_VERSION: "0.11", APP_BETA_SIZE: "58 MB" })).toMatchObject({ version: "0.11", size: "58 MB" });
  });
});

describe("getWaitlistUrl", () => {
  it("allows https, and http only on this machine", () => {
    expect(getWaitlistUrl({ MYTO_WAITLIST_URL: "https://myto-moto.com/api/waitlist" })).toBe("https://myto-moto.com/api/waitlist");
    expect(getWaitlistUrl({ MYTO_WAITLIST_URL: "http://localhost:3100/api/waitlist" })).toBe("http://localhost:3100/api/waitlist");
    expect(getWaitlistUrl({ MYTO_WAITLIST_URL: "http://example.com/api/waitlist" })).toBeUndefined();
    expect(getWaitlistUrl({})).toBeUndefined();
  });
});
