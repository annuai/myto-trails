import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/status', () => ({ toTrailLike: (t: unknown) => t }));
vi.mock('@/api/useApi', () => ({ useTrailSearch: () => ({}) }));
vi.mock('@/store/location', () => ({ useLocation: () => undefined }));
vi.mock('@/ui/Sheet', () => ({ Sheet: () => null }));
vi.mock('@/ui/TrailRow', () => ({ TrailRow: () => null }));
vi.mock('@/ui/Field', () => ({ Field: () => null }));
vi.mock('@/ui/EmptyState', () => ({ EmptyState: () => null }));
vi.mock('@/ui/Text', () => ({ Text: () => null }));
vi.mock('react-native', () => ({ View: () => null }));
vi.mock('lucide-react-native', () => ({ CloudOff: () => null, Search: () => null }));

import { NEARBY_COUNT, nearestTrails } from './TrailPickerSheet';
import type { TrailSummary } from '@/api/types';

const trail = (slug: string, lat: number, lon: number) => ({ slug, lat, lon }) as unknown as TrailSummary;

describe('nearestTrails', () => {
  const all = [trail('far', 28.6, 77.2), trail('mid', 13.4, 77.7), trail('near', 12.97, 77.59), trail('also-far', 19, 72.8), trail('a', 12.9, 77.6), trail('b', 13.0, 77.5), trail('c', 13.1, 77.4)];
  it('returns the nearest first, and only the count asked for', () => {
    const got = nearestTrails(all, { lat: 12.9716, lng: 77.5946 }, NEARBY_COUNT);
    expect(got).toHaveLength(5);
    expect(got[0]!.slug).toBe('near');
    expect(got.map((t) => t.slug)).not.toContain('far');
  });
  it('shows the first few as listed when there is no position', () => {
    expect(nearestTrails(all, undefined, 3).map((t) => t.slug)).toEqual(['far', 'mid', 'near']);
  });
  it('does not change the list it was given', () => {
    const copy = [...all];
    nearestTrails(all, { lat: 0, lng: 0 }, 5);
    expect(all).toEqual(copy);
  });
});
