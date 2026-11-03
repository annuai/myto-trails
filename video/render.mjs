// Renders the three sizes. Voice-over and music are included only if their files exist:
//   public/audio/voiceover.m4a   (run ./make-voiceover.sh)
//   public/audio/music.mp3       (your licensed track)
// Usage: node render.mjs [9x16|4x5|16x9 ...]   (default: all three)
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const props = JSON.stringify({ voice: existsSync('public/audio/voiceover.m4a'), music: existsSync('public/audio/music.mp3') });
const sizes = process.argv.slice(2).length ? process.argv.slice(2) : ['9x16', '4x5', '16x9'];
console.log('props', props);
for (const s of sizes) {
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', `Promo-${s}`, `out/promo-${s}.mp4`, `--props=${props}`, '--codec=h264', '--crf=21', '--audio-codec=aac'], { stdio: 'inherit' });
}
