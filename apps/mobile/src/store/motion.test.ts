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
