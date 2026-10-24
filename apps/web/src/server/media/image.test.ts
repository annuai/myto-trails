// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processImage } from "./image";

const flat = (w: number, h: number, fmt: "jpeg" | "png" | "webp" | "avif" = "jpeg") =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 120, b: 40 } } })[fmt]().toBuffer();

const meta = (b: Uint8Array) => sharp(Buffer.from(b)).metadata();

describe("processImage: accepted images", () => {
  it("makes WebP variants up to 1800 px and AVIF variants up to 1200 px, never upscaling", async () => {
    const r = await processImage(await flat(3000, 2000));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.width).toBe(3000);
    expect(r.height).toBe(2000);
    const webp = r.variants.filter((v) => v.format === "webp").map((v) => v.width);
    const avif = r.variants.filter((v) => v.format === "avif").map((v) => v.width);
    expect(webp).toEqual([400, 800, 1200, 1800]);
    expect(avif).toEqual([400, 800, 1200]);
    for (const v of r.variants) {
      const m = await meta(v.bytes);
      expect(m.width).toBe(v.width);
      expect(m.height).toBe(v.height);
      expect(v.height).toBe(Math.round((v.width * 2000) / 3000));
    }
  });

  it("keeps a small image at its own size", async () => {
    const r = await processImage(await flat(300, 200, "png"));
    expect(r.ok && r.variants.map((v) => [v.format, v.width])).toEqual([["webp", 300], ["avif", 300]]);
  });

  it.each(["jpeg", "png", "webp", "avif"] as const)("accepts %s input", async (fmt) => {
    expect((await processImage(await flat(600, 400, fmt))).ok).toBe(true);
  });

  it("applies the EXIF orientation before resizing", async () => {
    const rotated = await sharp({ create: { width: 800, height: 400, channels: 3, background: "#ccc" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const r = await processImage(rotated);
    expect(r.ok && [r.width, r.height]).toEqual([400, 800]);
  });

  it("strips all metadata, including GPS, from every variant", async () => {
    const withGps = await sharp({ create: { width: 1000, height: 700, channels: 3, background: "#888" } })
      .jpeg()
      .withExif({ IFD0: { Copyright: "Someone" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "11/1 36/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "76/1 6/1 0/1" } })
      .toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeDefined(); // the test input really carries EXIF
    const r = await processImage(withGps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const v of r.variants) {
      const m = await meta(v.bytes);
      expect(m.exif).toBeUndefined();
      expect(m.xmp).toBeUndefined();
      expect(m.iptc).toBeUndefined();
      expect(Buffer.from(v.bytes).includes(Buffer.from("GPS"))).toBe(false);
      expect(Buffer.from(v.bytes).includes(Buffer.from("Someone"))).toBe(false);
    }
  });

  it("returns a tiny WebP placeholder as a data URI", async () => {
    const r = await processImage(await flat(1200, 800));
    expect(r.ok && r.placeholder.startsWith("data:image/webp;base64,")).toBe(true);
    expect(r.ok && r.placeholder.length).toBeLessThan(2500);
  });

  it("re-encodes, so bytes hidden after the image never reach the output", async () => {
    const jpeg = await flat(800, 600);
    const polyglot = Buffer.concat([jpeg, Buffer.from("<script>alert(1)</script><?php system($_GET['c']); ?>")]);
    const r = await processImage(polyglot);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const v of r.variants) {
      const text = Buffer.from(v.bytes).toString("latin1");
      expect(text).not.toContain("<script");
      expect(text).not.toContain("<?php");
    }
  });

  it("finishes a 12 megapixel photo within a sensible time", async () => {
    const started = Date.now();
    const noisy = await sharp({ create: { width: 4000, height: 3000, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 30 } } as never }).jpeg({ quality: 80 }).toBuffer();
    const r = await processImage(noisy);
    expect(r.ok).toBe(true);
    expect(Date.now() - started).toBeLessThan(20_000);
  }, 30_000);
});

describe("processImage: rejected input", () => {
  it.each([
    ["empty bytes", new Uint8Array(0)],
    ["plain text", new TextEncoder().encode("this is not an image at all")],
    ["random bytes", Uint8Array.from({ length: 5000 }, (_, i) => (i * 131 + 7) % 256)],
    ["a zip archive header", Uint8Array.from([0x50, 0x4b, 0x03, 0x04, ...Array(200).fill(0)])],
    ["an SVG with script", new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ["an HTML page", new TextEncoder().encode("<html><script>alert(1)</script></html>")],
  ])("rejects %s", async (_label, bytes) => {
    const r = await processImage(bytes);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["not_image", "unsupported_format", "corrupt"]).toContain(r.error);
  });

  it("rejects formats we do not accept, such as GIF", async () => {
    const gif = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#f00" } }).gif().toBuffer();
    expect(await processImage(gif)).toMatchObject({ ok: false, error: "unsupported_format" });
  });

  it("rejects a truncated JPEG", async () => {
    const jpeg = await flat(2000, 1500);
    const r = await processImage(new Uint8Array(jpeg.subarray(0, Math.floor(jpeg.length / 3))));
    expect(r.ok).toBe(false);
  });

  it("refuses an image that claims an enormous size (decompression bomb)", async () => {
    // A PNG whose header claims 20,000 x 20,000 pixels (400 megapixels) but carries almost no data.
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d49484452" + "00004e20" + "00004e20" + "0802000000" + "00000000" + "0000000049454e44ae426082", "hex",
    );
    const r = await processImage(png);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["too_many_pixels", "corrupt"]).toContain(r.error);
  });

  it("explains rejections in plain language", async () => {
    const r = await processImage(new TextEncoder().encode("nope"));
    expect(r.ok === false && r.message).toMatch(/photo|image/i);
  });
});
