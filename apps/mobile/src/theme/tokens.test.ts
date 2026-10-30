import { describe, expect, it } from 'vitest';
import { layout, radius, rhythm, shadow, size, space } from './tokens';

describe('design tokens', () => {
  it('spacing steps only go up, with no repeats', () => {
    const steps = [space.half, space[1], space[2], space[3], space[4], space[5], space[6], space[8], space[12]];
    expect(steps.every((v, i) => i === 0 || v > steps[i - 1]!)).toBe(true);
    expect(new Set(Object.values(space)).size).toBe(Object.values(space).length);
  });
  it('the page rhythm is made of spacing steps, so titles and sections can never drift from the scale', () => {
    const steps = new Set<number>(Object.values(space));
    for (const v of Object.values(rhythm)) expect(steps.has(v)).toBe(true);
  });
  it('a thumb is always given at least 44 points', () => {
    expect(size.target).toBeGreaterThanOrEqual(44);
    expect(size.compact).toBeGreaterThanOrEqual(44);
    expect(size.button).toBeGreaterThanOrEqual(size.target);
  });
  it('the pill radius is bigger than any real corner, so it always makes a circle or a pill', () => {
    const { chip, ...corners } = radius;
    for (const r of Object.values(corners)) expect(chip).toBeGreaterThan(r);
  });
  it('floating shadows lift by a spacing step, and the sideways width is not narrower than the upright one', () => {
    expect(shadow.bar.shadowOffset.height).toBe(space[1]);
    expect(layout.wideMax).toBeGreaterThanOrEqual(layout.barMax);
    expect(layout.frameLandscape).toBeGreaterThan(layout.frame);
  });
});
