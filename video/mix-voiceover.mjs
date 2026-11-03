// Mixes the narration lines (public/audio/vo/01.mp3 ...) into public/audio/voiceover.m4a, each placed at its start time in voiceover-lines.json.
// Silence at the start and end of every line is trimmed first, so "at" is when the first word is heard.
// Usage: node mix-voiceover.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

const lines = JSON.parse(readFileSync('voiceover-lines.json', 'utf8'));
mkdirSync('.cache/trim', { recursive: true });
mkdirSync('public/audio', { recursive: true });
const duration = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse';
const files = [];
let prevEnd = 0;
for (const line of lines) {
  const src = ['mp3', 'wav', 'm4a'].map((e) => `public/audio/vo/${line.file}.${e}`).find(existsSync);
  if (!src) { console.error(`Missing public/audio/vo/${line.file}.(mp3|wav|m4a)`); process.exit(1); }
  const out = `.cache/trim/${line.file}.wav`;
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-af', trim, out]);
  const end = line.at + duration(out);
  console.log(`${line.file}  ${line.at.toFixed(1).padStart(5)}s to ${end.toFixed(1).padStart(5)}s  gap before ${(line.at - prevEnd).toFixed(1)}s${line.at < prevEnd ? '  OVERLAP' : ''}`);
  prevEnd = end;
  files.push(out);
}

const inputs = files.flatMap((f) => ['-i', f]);
const delays = lines.map((l, i) => `[${i}]adelay=${Math.round(l.at * 1000)}|${Math.round(l.at * 1000)}[a${i}]`).join(';');
const mix = lines.map((_, i) => `[a${i}]`).join('');
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', `${delays};${mix}amix=inputs=${lines.length}:normalize=0,loudnorm=I=-16:TP=-1.5,apad=whole_dur=60`, '-t', '60', '-c:a', 'aac', '-b:a', '160k', 'public/audio/voiceover.m4a'], { stdio: 'inherit' });
console.log('wrote public/audio/voiceover.m4a');
