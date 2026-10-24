// Converts a phone video into a web-friendly MP4 (H.264 + AAC, 720p, fast start) plus a poster image, with all
// metadata (including GPS) removed. Needs ffmpeg (brew install ffmpeg).
// Run: npx tsx scripts/make-trail-video.mts <slug> <number> <input-file>    ->  prints the video JSON
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import sharp from "sharp";

const [slug, number, input] = process.argv.slice(2);
if (!slug || !number || !input) throw new Error("usage: make-trail-video.mts <slug> <number> <input-file>");
const dir = `public/videos/${slug}`;
mkdirSync(dir, { recursive: true });
const mp4 = `${dir}/video-${number}.mp4`;
const poster = `${dir}/video-${number}-poster.webp`;

// Phone videos can carry several audio tracks (for example spatial audio ffmpeg cannot decode): use the AAC one.
const streams = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=index,codec_name,codec_type", "-of", "json", input]).toString()).streams as { index: number; codec_name: string; codec_type: string }[];
const aac = streams.find((x) => x.codec_type === "audio" && x.codec_name === "aac");

// Orientation is applied by ffmpeg; keep the long side at 1280 px at most, even dimensions, no metadata or extra tracks.
const scale = "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'";
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-map", "0:v:0", ...(aac ? ["-map", `0:${aac.index}`] : ["-an"]), "-vf", scale, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-map_metadata", "-1", "-map_chapters", "-1", mp4]);
const frame = `${dir}/.poster-${number}.jpg`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1", "-i", input, "-frames:v", "1", "-vf", scale, frame]);
await sharp(frame).rotate().webp({ quality: 80 }).toFile(poster); // sharp drops metadata by default
rmSync(frame);

const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", mp4]).toString());
console.log(JSON.stringify({
  mp4: `/videos/${slug}/video-${number}.mp4`,
  poster: `/videos/${slug}/video-${number}-poster.webp`,
  width: probe.streams[0].width,
  height: probe.streams[0].height,
  durationS: Math.round(Number(probe.format.duration)),
  sizeMb: Math.round((statSync(mp4).size / 1e6) * 10) / 10,
}));
