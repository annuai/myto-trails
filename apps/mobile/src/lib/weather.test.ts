import { describe, expect, it } from 'vitest';
import { forecastUrl, parseForecast, rideability, rideabilityText, type DayForecast } from './weather';

const day = (o: Partial<DayForecast> = {}): DayForecast => ({ date: '2026-11-01', maxC: 28, minC: 18, rainMm: 0, rainPct: 10, windKmh: 15, snowCm: 0, ...o });

describe('forecastUrl', () => {
  it('asks Open-Meteo for the daily numbers, clamped to 1..16 days', () => {
    const u = forecastUrl(34.1526, 77.5771, 40);
    expect(u).toContain('https://api.open-meteo.com/v1/forecast?latitude=34.153&longitude=77.577');
    expect(u).toContain('precipitation_sum');
    expect(u).toContain('forecast_days=16');
    expect(forecastUrl(12, 77, 0)).toContain('forecast_days=1');
  });
});

describe('parseForecast', () => {
  it('reads the daily arrays into one entry per day', () => {
    const out = parseForecast({ daily: { time: ['2026-11-01', '2026-11-02'], temperature_2m_max: [30, 20], temperature_2m_min: [20, 8], precipitation_sum: [0, 12.4], precipitation_probability_max: [5, 80], wind_speed_10m_max: [10, 45], snowfall_sum: [0, null] } });
    expect(out).toEqual([
      { date: '2026-11-01', maxC: 30, minC: 20, rainMm: 0, rainPct: 5, windKmh: 10, snowCm: 0 },
      { date: '2026-11-02', maxC: 20, minC: 8, rainMm: 12.4, rainPct: 80, windKmh: 45, snowCm: 0 },
    ]);
  });
  it('drops a day with no temperatures and copes with a bad answer', () => {
    expect(parseForecast({ daily: { time: ['2026-11-01'], temperature_2m_max: [null], temperature_2m_min: [null] } })).toEqual([]);
    expect(parseForecast(null)).toEqual([]);
    expect(parseForecast({ error: true })).toEqual([]);
  });
});

describe('rideability', () => {
  it('is good on an ordinary day', () => {
    expect(rideability(day())).toEqual({ level: 'good', reasons: [] });
    expect(rideabilityText(rideability(day()))).toBe('Good to ride');
  });
  it('takes the worst of the causes and lists each one', () => {
    const r = rideability(day({ rainMm: 35, windKmh: 45 }));
    expect(r.level).toBe('avoid');
    expect(r.reasons).toHaveLength(2);
  });
  it('flags heat, wind and rain at their caution levels', () => {
    expect(rideability(day({ maxC: 39 })).level).toBe('caution');
    expect(rideability(day({ windKmh: 40 })).level).toBe('caution');
    expect(rideability(day({ rainPct: 75 })).level).toBe('caution');
    expect(rideability(day({ rainMm: 10 })).level).toBe('caution');
  });
  it('flags snow or ice when it is freezing even with no snowfall forecast', () => {
    expect(rideability(day({ minC: -2 }))).toEqual({ level: 'caution', reasons: ['Snow or ice possible'] });
    expect(rideability(day({ snowCm: 8 })).level).toBe('avoid');
  });
});
