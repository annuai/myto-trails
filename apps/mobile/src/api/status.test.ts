import { describe, expect, it } from 'vitest';
import { headline, toTrailLike } from './status';
import type { TrailSummary } from './types';

describe('headline status', () => {
  it('shows the worse of access and condition, so a closed trail never reads as open', () => {
    expect(headline({ accessClass: 'public', condition: 'open' })).toMatchObject({ status: 'good', label: 'Publicly accessible' });
    expect(headline({ accessClass: 'public', condition: 'temporarily_closed' })).toMatchObject({ status: 'stop', label: 'Temporarily closed' });
    expect(headline({ accessClass: 'permission_required', condition: 'open' })).toMatchObject({ status: 'caution' });
    expect(headline({ accessClass: 'restricted', condition: 'open' })).toMatchObject({ status: 'stop' });
  });
  it('maps a trail for the list, without inventing missing numbers', () => {
    const t = { slug: 'a-b', name: 'A B', distanceKm: null, estDurationMin: 90, difficulty: 'moderate', accessClass: 'unknown', condition: 'unknown', cover: null } as unknown as TrailSummary;
    expect(toTrailLike(t)).toMatchObject({ id: 'a-b', km: 0, time: '1h 30m', difficulty: 'Moderate', status: 'unknown', cover: undefined });
  });
});
