import { describe, expect, it } from 'vitest';
import { SAMPLE_RIDE_ID, withoutSampleRide } from './sim';

describe('withoutSampleRide', () => {
  it('drops the old sample ride and keeps every real one, in order', () => {
    const rides = [{ id: 'a' }, { id: SAMPLE_RIDE_ID }, { id: 'b' }];
    expect(withoutSampleRide(rides)).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
  it('leaves a list without it alone, and an empty one empty', () => {
    expect(withoutSampleRide([{ id: 'a' }])).toEqual([{ id: 'a' }]);
    expect(withoutSampleRide([])).toEqual([]);
  });
});
