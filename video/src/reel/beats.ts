import { FPS } from '../core';

/** public/audio/music.mp3, measured with `node beats.mjs`: 119 bpm, first beat at 0.07 s. Change both if the track changes. */
export const BPM = 119;
const FIRST = 0.07;

/** The frame of beat `n`. Every cut in the Reel sits on one. */
export const beat = (n: number) => Math.round((FIRST + (n * 60) / BPM) * FPS);

/** Frames in one beat (about 15 at 30 fps). */
export const BEAT = (60 / BPM) * FPS;

/** The shot list in beats: [start, end). The music lifts at beat 16, where the ten-beat feature run starts. */
export const SHOTS = {
  open: [0, 4],
  hero: [4, 16],
  trail: [16, 26],
  plan: [26, 36],
  pack: [36, 46],
  navigate: [46, 56],
  journal: [56, 66],
  sos: [66, 76],
  year: [76, 86],
  horizon: [86, 96],
  end: [96, 108],
} as const;

export const REEL_DURATION = beat(SHOTS.end[1]);
