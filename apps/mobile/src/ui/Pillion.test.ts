import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { POSES, POSE_IDS } from '../../assets/pillion/poses';
import { pillion } from './Pillion.tokens';

describe('Pillion poses', () => {
  it('has the eight P0 poses and the three added for visits, each registered', () => {
    expect([...POSE_IDS].sort()).toEqual(['asleep', 'campfire', 'hello', 'map', 'map-reading', 'paw-up', 'standing-up', 'time-to-rest', 'tired-happy', 'waiting', 'waiting-for-a-ride']);
    expect(Object.keys(POSES).sort()).toEqual([...POSE_IDS].sort());
  });
  it('never labels a rider a beginner', () => {
    for (const p of Object.values(POSES)) expect(p.label).not.toMatch(/noob|beginner|new/i);
  });
  it('has a webp picture for every pose', () => {
    for (const id of POSE_IDS) expect(existsSync(resolve(__dirname, `../../assets/pillion/${id}.webp`)), id).toBe(true);
  });
  it('marks the picture that is cut off at the bike so a dialog can put it flush to the edge', () => {
    expect(POSES['waiting-for-a-ride'].bleed).toBe('right');
    expect(POSES['time-to-rest'].bleed).toBeUndefined();
  });
  it('has growing sizes', () => {
    expect(pillion.sm).toBeLessThan(pillion.md);
    expect(pillion.md).toBeLessThan(pillion.lg);
  });
});
