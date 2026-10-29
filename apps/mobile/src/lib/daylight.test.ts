import { describe, expect, it } from 'vitest';
import { ALERT_BEFORE_MIN, DARK_BUFFER_MIN, daylightAdvice, daylightAlertDue, daylightText, fetchSunsetMs } from './daylight';

const H = 3_600_000;
const SUNSET = Date.parse('2026-11-01T12:30:00Z'); // 18:00 in India

describe('daylightAdvice', () => {
  it('ends before dark: no dark kilometres, and a latest start before the buffer', () => {
    const a = daylightAdvice({ distanceKm: 70, sunsetMs: SUNSET, now: SUNSET - 5 * H, kmh: 35 }); // 2 hours of riding
    expect(a.rideMs).toBe(2 * H);
    expect(a.darkKm).toBe(0);
    expect(a.latestStartMs).toBe(SUNSET - DARK_BUFFER_MIN * 60_000 - 2 * H);
  });
  it('counts the kilometres after sunset when the ride runs past it', () => {
    const a = daylightAdvice({ distanceKm: 140, sunsetMs: SUNSET, now: SUNSET - 2 * H, kmh: 35 }); // 4 h: 2 h after dark = 70 km
    expect(a.darkKm).toBe(70);
  });
  it('never counts more dark kilometres than the route has', () => {
    expect(daylightAdvice({ distanceKm: 30, sunsetMs: SUNSET, now: SUNSET + H, kmh: 35 }).darkKm).toBe(30);
  });
});

describe('daylightText', () => {
  it('says it is dark already after sunset', () => {
    const now = SUNSET + 600_000;
    expect(daylightText(daylightAdvice({ distanceKm: 20, sunsetMs: SUNSET, now }), now)).toMatch(/has set/);
  });
  it('says when you would finish if it is before dark', () => {
    const now = SUNSET - 6 * H;
    expect(daylightText(daylightAdvice({ distanceKm: 35, sunsetMs: SUNSET, now }), now)).toMatch(/before dark/);
  });
  it('gives the time to leave by, for tomorrow, when part of it would be after dark', () => {
    const now = SUNSET - 2 * H;
    const text = daylightText(daylightAdvice({ distanceKm: 140, sunsetMs: SUNSET, now }), now);
    expect(text).toMatch(/about 70 km is after dark/);
    expect(text).toMatch(/leave by .* tomorrow\.$/);
  });
});

describe('daylightAlertDue', () => {
  it('is due only in the 45 minutes before sunset, and once', () => {
    expect(daylightAlertDue(SUNSET - (ALERT_BEFORE_MIN + 1) * 60_000, SUNSET, false)).toBe(false);
    expect(daylightAlertDue(SUNSET - ALERT_BEFORE_MIN * 60_000, SUNSET, false)).toBe(true);
    expect(daylightAlertDue(SUNSET - 60_000, SUNSET, true)).toBe(false);
    expect(daylightAlertDue(SUNSET, SUNSET, false)).toBe(false);
  });
});

describe('fetchSunsetMs', () => {
  const ok = (body: unknown) => (() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))) as unknown as typeof fetch;
  it('reads today\'s sunset', async () => {
    const body = { utc_offset_seconds: 19_800, daily: { time: ['2026-11-01'], temperature_2m_max: [30], temperature_2m_min: [20], sunset: ['2026-11-01T18:00'] } };
    expect(await fetchSunsetMs(12.9, 77.6, ok(body))).toBe(SUNSET);
  });
  it('is undefined with no signal or a bad answer', async () => {
    expect(await fetchSunsetMs(12.9, 77.6, (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch)).toBeUndefined();
    expect(await fetchSunsetMs(12.9, 77.6, ok({}))).toBeUndefined();
  });
});
