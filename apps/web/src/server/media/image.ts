import { IMAGE_MAX_MEGAPIXELS } from "@moto-trails/domain";
import sharp, { type Metadata } from "sharp";

export type ImageVariant = { format: "webp" | "avif"; width: number; height: number; bytes: Uint8Array };
export type ImageError = "not_image" | "unsupported_format" | "too_many_pixels" | "corrupt";
export type ImageResult =
  | { ok: true; width: number; height: number; variants: ImageVariant[]; placeholder: string }
  | { ok: false; error: ImageError; message: string };

const ACCEPTED = new Set(["jpeg", "png", "webp", "avif"]);
const WIDTHS = [400, 800, 1200, 1800] as const;
const AVIF_MAX_WIDTH = 1200;
const MAX_PIXELS = IMAGE_MAX_MEGAPIXELS * 1_000_000;

const fail = (error: ImageError, message: string): ImageResult => ({ ok: false, error, message });

/**
 * Decodes an untrusted upload and re-encodes it: the format is decided by the bytes (never the claimed type),
 * the pixel count is capped before decoding, the EXIF orientation is applied, and every variant is written
 * without metadata, so GPS and other tags cannot reach the public site.
 */
export async function processImage(input: Uint8Array): Promise<ImageResult> {
  if (input.byteLength === 0) return fail("not_image", "That file is empty. Choose a photo (JPEG, PNG, WebP or AVIF).");
  const buffer = Buffer.from(input);

  let meta: Metadata;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: "error" }).metadata();
  } catch (e) {
    const text = e instanceof Error ? e.message : "";
    if (/pixel limit/i.test(text)) return fail("too_many_pixels", `That image is larger than ${IMAGE_MAX_MEGAPIXELS} megapixels. Resize it and try again.`);
    if (/unsupported image format|input buffer contains/i.test(text)) return fail("not_image", "That file is not a photo we can read. Choose a JPEG, PNG, WebP or AVIF image.");
    return fail("corrupt", "That image looks damaged and could not be read.");
  }
  // AVIF files are reported as "heif" with AV1 compression; HEIC (HEVC) is not accepted.
  const isAvif = meta.format === "heif" && meta.compression === "av1";
  if (!meta.format || (!ACCEPTED.has(meta.format) && !isAvif)) {
    return fail("unsupported_format", "Only JPEG, PNG, WebP and AVIF photos are accepted.");
  }
  if (!meta.width || !meta.height) return fail("corrupt", "That image looks damaged and could not be read.");
  if (meta.width * meta.height > MAX_PIXELS) {
    return fail("too_many_pixels", `That image is larger than ${IMAGE_MAX_MEGAPIXELS} megapixels. Resize it and try again.`);
  }

  try {
    // Apply the orientation once and work from the upright image.
    const upright = await sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: "error" }).rotate().toColourspace("srgb").toBuffer({ resolveWithObject: true });
    const { width, height } = upright.info;
    const widths = WIDTHS.filter((w) => w <= width);
    const targets = widths.length > 0 ? widths : [width];

    const variants: ImageVariant[] = [];
    for (const w of targets) {
      const base = sharp(upright.data).resize({ width: w, withoutEnlargement: true });
      const webp = await base.clone().webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
      variants.push({ format: "webp", width: webp.info.width, height: webp.info.height, bytes: new Uint8Array(webp.data) });
    }
    for (const w of targets.filter((t) => t <= AVIF_MAX_WIDTH)) {
      const avif = await sharp(upright.data).resize({ width: w, withoutEnlargement: true }).avif({ quality: 50, effort: 3 }).toBuffer({ resolveWithObject: true });
      variants.push({ format: "avif", width: avif.info.width, height: avif.info.height, bytes: new Uint8Array(avif.data) });
    }
    const tiny = await sharp(upright.data).resize({ width: 20 }).webp({ quality: 40 }).toBuffer();
    return { ok: true, width, height, variants, placeholder: `data:image/webp;base64,${tiny.toString("base64")}` };
  } catch {
    return fail("corrupt", "That image looks damaged and could not be processed.");
  }
}
