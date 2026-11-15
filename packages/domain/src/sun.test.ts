import { describe, expect, it } from 'vitest';
import { sunTimes } from './sun';

const MIN = 60_000;
const utc = (s: string) => Date.parse(`${s}Z`);
const near = (got: number | undefined, want: string) => expect(Math.abs((got ?? 0) - utc(want))).toBeLessThan(3 * MIN);

describe('sunTimes', () => {
  it('matches published times for London at midsummer', () => {
    const s = sunTimes(utc('2026-06-21T12:00:00'), 51.5074, -0.1278);
    near(s?.sunriseMs, '2026-06-21T03:43:00');
    near(s?.sunsetMs, '2026-06-21T20:21:00');
  });

  it('matches published times for New Delhi on New Year', () => {
    // 07:14 and 17:36 IST (UTC+5:30).
    const s = sunTimes(utc('2026-01-01T06:30:00'), 28.6139, 77.209);
    near(s?.sunriseMs, '2026-01-01T01:44:00');
    near(s?.sunsetMs, '2026-01-01T12:06:00');
  });

  it('picks the day asked for west of Greenwich', () => {
    // Los Angeles midday local (20:00 UTC); sunrise about 06:28 PST = 14:28 UTC.
    const s = sunTimes(utc('2026-11-15T20:00:00'), 34.05, -118.24);
    near(s?.sunriseMs, '2026-11-15T14:28:00');
  });

  it('has no sunrise in the polar night', () => {
    expect(sunTimes(utc('2026-12-21T12:00:00'), 78.22, 15.65)).toBeUndefined();
  });
});
