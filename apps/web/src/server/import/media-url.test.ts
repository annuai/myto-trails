import { describe, expect, it } from "vitest";
import { resolveMediaUrl } from "./media-url";

describe("resolveMediaUrl", () => {
  it("maps site paths for photos and videos into the public prefix of the store", () => {
    expect(resolveMediaUrl("/photos/a/photo-1-400.webp", "https://pub-x.r2.dev")).toBe("https://pub-x.r2.dev/public/photos/a/photo-1-400.webp");
    expect(resolveMediaUrl("/videos/a/video-1.mp4", "https://pub-x.r2.dev/")).toBe("https://pub-x.r2.dev/public/videos/a/video-1.mp4");
  });
  it("leaves absolute urls, other paths and the no-store case alone", () => {
    expect(resolveMediaUrl("https://cdn.example.com/a.webp", "https://pub-x.r2.dev")).toBe("https://cdn.example.com/a.webp");
    expect(resolveMediaUrl("/images/hero.webp", "https://pub-x.r2.dev")).toBe("/images/hero.webp");
    expect(resolveMediaUrl("/photos/a/b.webp")).toBe("/photos/a/b.webp");
  });
});
