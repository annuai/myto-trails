import { describe, expect, it } from 'vitest';
import { createMotionStore } from './motionCore';

const T0 = 1_700_000_000_000;
const fix = (i: number) => ({ t: T0 + i * 1000, lat: 13, lng: 77.6, speed: 0, acc: 5 });

describe('motion store', () => {
  it('becomes stopped after 8 s of still fixes and goes back to moving when fixes stop arriving', () => {
    const m = createMotionStore();
    for (let i = 0; i < 10; i++) m.getState().feed(fix(i));
    m.getState().refresh(T0 + 9000);
    expect(m.getState().stopped).toBe(true);
    m.getState().refresh(T0 + 16_000);
    expect(m.getState().stopped).toBe(false);
  });
  it('reset forgets everything', () => {
    const m = createMotionStore();
    for (let i = 0; i < 10; i++) m.getState().feed(fix(i));
    m.getState().refresh(T0 + 9000);
    m.getState().reset();
    expect(m.getState().stopped).toBe(false);
  });
});

describe('motion store with shaking and steps', () => {
  it('a bike shaking with no GPS counts as moving, not stopped', () => {
    const m = createMotionStore();
    for (let i = 0; i < 10; i++) m.getState().feedShake(T0 + i * 2000, 0.06, 0);
    expect(m.getState().activity).toBe('riding');
    expect(m.getState().stopped).toBe(false);
  });
  it('walking steps with slow GPS is on foot, which counts as safe to type', () => {
    const m = createMotionStore();
    for (let i = 0; i < 12; i++) { m.getState().feed({ t: T0 + i * 1000, lat: 13 + i * 1e-5, lng: 77.6, speed: 1.1, acc: 8 }); m.getState().feedShake(T0 + i * 1000, 0.3, 2); }
    expect(m.getState().activity).toBe('on_foot');
    expect(m.getState().stopped).toBe(true);
  });
  it('gives the evidence and the answer to the trace callback', () => {
    const seen: string[] = [];
    const m = createMotionStore((e, after) => seen.push(`${e.k}:${after.state}`));
    m.getState().feed(fix(0));
    expect(seen).toEqual(['gps:stopped_brief']);
  });
});
