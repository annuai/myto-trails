// Cuts the iPhone screen recordings in raw/ (not committed; 1206 x 2622) into the Reel's clips in public/capture/reel/.
// Each clip is a list of [raw file, start s, end s, speed]: trimmed, sped up, status bar cropped (185 px, so the frame
// matches the app's 390 x 788 pt below the bar), scaled to 1080 wide, 30 fps, no audio.
// Usage: node prepare-captures.mjs [clip ...]   (default: all)
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const RIDE = '12-56-46'; // start a ride, record with a moving map, SOS hold, ride story
const PLAN = '13-01-35'; // plan a trip, Pillion dialog, destinations, pack list
const YOU = '13-02-44'; // You tab, Your year, share card
const JOURNAL = '13-03-22'; // Dash, journal list, a photo entry
const TRAIL = '13-03-49'; // Trails, trail page, navigate to the start

export const CLIPS = {
  ride: [[RIDE, 22.4, 34.4, 2]],
  trail: [[TRAIL, 2.2, 6.6, 1.8], [TRAIL, 6.6, 8.3, 0.9]],
  plan: [[PLAN, 4, 12, 4], [PLAN, 14.2, 17.2, 1.2]],
  pack: [[PLAN, 31, 41, 2.5]],
  navigate: [[TRAIL, 27.6, 33.8, 1.5]],
  journal: [[JOURNAL, 5, 13, 1.8]],
  year: [[YOU, 2, 14, 5], [YOU, 14, 19, 2.5]],
};

const STATUS_BAR = 185;
mkdirSync('public/capture/reel', { recursive: true });
const pick = process.argv.slice(2);
for (const [name, segs] of Object.entries(CLIPS)) {
  if (pick.length && !pick.includes(name)) continue;
  const args = ['-v', 'error', '-y'];
  segs.forEach(([file, a, z]) => args.push('-ss', String(a), '-t', String(z - a), '-i', `raw/${file}.mp4`));
  const parts = segs.map(([, , , speed], i) => `[${i}:v]setpts=(PTS-STARTPTS)/${speed},fps=30,crop=1206:2622-${STATUS_BAR}:0:${STATUS_BAR},scale=1080:-2,setsar=1[v${i}]`);
  const filter = `${parts.join(';')};${segs.map((_, i) => `[v${i}]`).join('')}concat=n=${segs.length}:v=1:a=0[out]`;
  args.push('-filter_complex', filter, '-map', '[out]', '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', `public/capture/reel/${name}.mp4`);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  console.log(name, segs.reduce((s, [, a, z, sp]) => s + (z - a) / sp, 0).toFixed(1), 's');
}
