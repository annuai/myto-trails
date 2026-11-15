// Finds a track's tempo and first downbeat, so the Reel's cuts land on the music.
// Usage: node beats.mjs [public/audio/music.mp3] [startSec]
// Prints bpm, the first beat (seconds) and a strong-onset list; copy bpm and offset into src/reel/beats.ts.
import { execFileSync } from 'node:child_process';

const file = process.argv[2] ?? 'public/audio/music.mp3';
const from = Number(process.argv[3] ?? 0);
const RATE = 11025;
const HOP = 256; // ~23 ms per frame
const pcm = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(from), '-t', '40', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);

// Onset strength: positive change in log energy per hop.
const n = Math.floor(x.length / HOP);
const energy = new Float32Array(n);
for (let i = 0; i < n; i++) {
  let s = 0;
  for (let j = 0; j < HOP; j++) s += x[i * HOP + j] ** 2;
  energy[i] = Math.log(1e-9 + s);
}
const onset = new Float32Array(n);
for (let i = 1; i < n; i++) onset[i] = Math.max(0, energy[i] - energy[i - 1]);

// Tempo: autocorrelation of the onset curve between 70 and 180 bpm.
const fps = RATE / HOP;
let best = { bpm: 0, score: -1, lag: 0 };
for (let bpm = 70; bpm <= 180; bpm += 0.25) {
  const lag = (60 / bpm) * fps;
  let s = 0;
  for (let i = 0; i + lag * 2 < n; i++) {
    const a = Math.round(i + lag);
    const b = Math.round(i + lag * 2);
    s += onset[i] * (onset[a] + 0.5 * onset[b]);
  }
  if (s > best.score) best = { bpm, score: s, lag };
}

// Phase: the offset whose beat grid collects the most onset energy.
let phase = { t: 0, score: -1 };
for (let o = 0; o < best.lag; o += 0.5) {
  let s = 0;
  for (let k = o; k < n; k += best.lag) s += onset[Math.round(k)] ?? 0;
  if (s > phase.score) phase = { t: o / fps, score: s };
}

const strong = [...onset]
  .map((v, i) => [v, i / fps])
  .sort((a, b) => b[0] - a[0])
  .slice(0, 16)
  .map(([, t]) => +(t + from).toFixed(2))
  .sort((a, b) => a - b);

console.log(JSON.stringify({ file, bpm: best.bpm, firstBeat: +(phase.t + from).toFixed(3), strongOnsets: strong }, null, 2));
