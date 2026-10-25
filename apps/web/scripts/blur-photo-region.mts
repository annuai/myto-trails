// Blurs one rectangle of a photo (a number plate, a face) and writes a clean JPEG. The box is given as fractions of the
// UPRIGHT photo (0 to 1), so it does not depend on the phone's rotation tag. HEIC: convert first (sips -s format jpeg).
// Run: npx tsx scripts/blur-photo-region.mts <in.jpg> <out.jpg> --box left,top,width,height [--sigma 25]
//   e.g. --box 0.664,0.630,0.064,0.034   (look at the photo, estimate the plate as a share of the width and height)
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const [input, output] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const box = flag("--box")?.split(",").map(Number);
if (!input || !output || !box || box.length !== 4 || box.some((n) => !Number.isFinite(n) || n < 0 || n > 1)) {
  throw new Error("usage: blur-photo-region.mts <in.jpg> <out.jpg> --box left,top,width,height   (fractions 0 to 1)");
}
const sigma = Number(flag("--sigma") ?? 25);

const upright = await sharp(input).rotate().toBuffer();
const { width: W, height: H } = await sharp(upright).metadata();
const region = { left: Math.round(box[0]! * W!), top: Math.round(box[1]! * H!), width: Math.round(box[2]! * W!), height: Math.round(box[3]! * H!) };
const patch = await sharp(upright).extract(region).blur(sigma).toBuffer();
await sharp(upright).composite([{ input: patch, left: region.left, top: region.top }]).jpeg({ quality: 92 }).toFile(output);
// A crop around the blurred area, to look at before using the photo.
const pad = Math.round(Math.max(region.width, region.height) * 3);
await sharp(output)
  .extract({ left: Math.max(0, region.left - pad), top: Math.max(0, region.top - pad), width: Math.min(W! - Math.max(0, region.left - pad), region.width + pad * 2), height: Math.min(H! - Math.max(0, region.top - pad), region.height + pad * 2) })
  .resize({ width: 700, withoutEnlargement: true })
  .toFile(output.replace(/\.jpe?g$/i, "") + ".check.jpg");
console.log(`blurred ${region.width}x${region.height}px at ${region.left},${region.top} -> ${output} (look at ${output.replace(/\.jpe?g$/i, "")}.check.jpg)`);
