import { describe, expect, it } from 'vitest';
import { adventureBike, dominarBike, dominarLimeBike } from './AdventureBike.tokens';

describe.each([['adventure bike', adventureBike], ['Dominar', dominarBike], ['lime Dominar', dominarLimeBike]])('%s artwork numbers', (_name, art) => {
  it('lays the wheels out inside the canvas: each wheel fits within the width and its bottom within the height', () => {
    for (const axle of [art.rear, art.front]) {
      expect(axle.x - art.wheel / 2).toBeGreaterThanOrEqual(0);
      expect(axle.x + art.wheel / 2).toBeLessThanOrEqual(art.width);
      expect(axle.y + art.wheel / 2).toBeLessThanOrEqual(art.height);
    }
    expect(art.height).toBeGreaterThanOrEqual(art.bodyHeight);
    expect(art.front.x).toBeGreaterThan(art.rear.x);
  });
});
