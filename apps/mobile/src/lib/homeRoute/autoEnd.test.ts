import { describe, expect, it } from 'vitest';
import {
  END_AFTER_WARN_MS, FRESH_FIX_MS, GUIDED_WARN_AFTER_STOP_MS, MIN_RIDE_M, MIN_RIDE_MS, STRIKES_TO_ASK, WARN_AFTER_STOP_MS,
  startAutoEnd, stepAutoEnd, type AutoEndState, type AutoEndWorld,
} from './autoEnd';

const NOW = new Date(2026, 10, 12, 18, 0).getTime();
const HOME = { lat: 52, lng: 5 };
// About 150 m north of home.
const WORK = { lat: 52.00135, lng: 5 };

// Home is saved, the rider is at it, has been 1 km away earlier, rode 8 km in 40 minutes and has stood still for a minute.
const world = (o: Partial<AutoEndWorld> = {}): AutoEndWorld => ({
  now: NOW, pos: HOME, posAt: NOW - 1_000, places: { home: HOME },
  ride: { running: true, paused: false, startedAt: NOW - 40 * 60_000, meters: 8_000, source: 'gps', waypointsAhead: false },
  inGroupRide: false, tripActive: false, stoppedForMs: WARN_AFTER_STOP_MS, enabled: true,
  strikes: { home: 0, work: 0 }, cancelled: [], ...o,
});
const away = (o: Partial<AutoEndState> = {}): AutoEndState => ({ ...startAutoEnd, left: { home: true, work: true }, ...o });
const step = (w: Partial<AutoEndWorld> = {}, s: AutoEndState = away()) => stepAutoEnd(s, world(w));

describe('stepAutoEnd', () => {
  it('with no Home or Work saved it never warns, asks or ends', () => {
    expect(step({ places: {} }).action).toBeNull();
  });
  it('disabled, not running or paused returns null', () => {
    const r = world().ride;
    expect(step({ enabled: false }).action).toBeNull();
    expect(step({ ride: { ...r, running: false } }).action).toBeNull();
    expect(step({ ride: { ...r, paused: true } }).action).toBeNull();
  });
  it('a ride under MIN_RIDE_M or MIN_RIDE_MS returns null', () => {
    const r = world().ride;
    expect(step({ ride: { ...r, meters: MIN_RIDE_M - 1 } }).action).toBeNull();
    expect(step({ ride: { ...r, startedAt: NOW - MIN_RIDE_MS + 1 } }).action).toBeNull();
  });
  it('a sim ride, a group ride or an active trip returns null (a trip is allowed only when guided to that place)', () => {
    const r = world().ride;
    expect(step({ ride: { ...r, source: 'sim' } }).action).toBeNull();
    expect(step({ inGroupRide: true }).action).toBeNull();
    expect(step({ tripActive: true }).action).toBeNull();
    expect(step({ tripActive: true, guideTo: HOME }).action).toBe('warn');
  });
  it('waypointsAhead returns null unless guided to the place', () => {
    const r = world().ride;
    expect(step({ ride: { ...r, waypointsAhead: true } }).action).toBeNull();
    expect(step({ ride: { ...r, waypointsAhead: true }, guideTo: HOME }).action).toBe('warn');
  });
  it('inside 200 m but never having left 1000 m returns null', () => {
    const r = stepAutoEnd(startAutoEnd, world());
    expect(r.action).toBeNull();
    expect(r.state.left.home).toBe(false);
  });
  it('a fix 1 km away marks the place as left', () => {
    const r = stepAutoEnd(startAutoEnd, world({ pos: { lat: 52.009, lng: 5 }, stoppedForMs: 0 }));
    expect(r.state.left.home).toBe(true);
  });
  it('a ride that left and returned, stopped 60 s, returns warn for home', () =>
    expect(step()).toMatchObject({ action: 'warn', kind: 'home', state: { warnedAt: NOW } }));
  it('not yet stopped long enough returns null', () => expect(step({ stoppedForMs: WARN_AFTER_STOP_MS - 1 }).action).toBeNull());
  it('warn then 30 s later returns end', () => {
    const warned = step().state;
    const r = stepAutoEnd(warned, world({ now: NOW + END_AFTER_WARN_MS, posAt: NOW + END_AFTER_WARN_MS - 1_000, stoppedForMs: WARN_AFTER_STOP_MS + END_AFTER_WARN_MS }));
    expect(r).toMatchObject({ action: 'end', kind: 'home' });
    expect(stepAutoEnd(warned, world({ now: NOW + 10_000, posAt: NOW + 9_000, stoppedForMs: 70_000 })).action).toBeNull();
  });
  it('riding off between warn and end returns null and resets (state.warnedAt null)', () => {
    const r = stepAutoEnd(step().state, world({ now: NOW + 10_000, posAt: NOW + 9_000, stoppedForMs: 0 }));
    expect(r.action).toBeNull();
    expect(r.state.warnedAt).toBeNull();
    const out = stepAutoEnd(step().state, world({ now: NOW + 10_000, posAt: NOW + 9_000, pos: { lat: 52.005, lng: 5 } }));
    expect(out.state.warnedAt).toBeNull();
  });
  it('a stale fix returns null', () => expect(step({ posAt: NOW - FRESH_FIX_MS - 1 }).action).toBeNull());
  it('guided to home, stopped 20 s, returns warn', () => {
    expect(step({ stoppedForMs: GUIDED_WARN_AFTER_STOP_MS }).action).toBeNull();
    expect(step({ stoppedForMs: GUIDED_WARN_AFTER_STOP_MS, guideTo: HOME }).action).toBe('warn');
  });
  it('work without guidance returns ask, not end', () => {
    const w = { places: { work: WORK }, pos: WORK };
    const asked = step(w);
    expect(asked).toMatchObject({ action: 'ask', kind: 'work' });
    const later = stepAutoEnd(asked.state, world({ ...w, now: NOW + END_AFTER_WARN_MS, posAt: NOW + END_AFTER_WARN_MS - 1_000, stoppedForMs: 120_000 }));
    expect(later.action).toBeNull();
    expect(step({ ...w, stoppedForMs: GUIDED_WARN_AFTER_STOP_MS, guideTo: WORK }).action).toBe('warn');
  });
  it('home with 2 strikes returns ask', () => {
    expect(step({ strikes: { home: STRIKES_TO_ASK - 1, work: 0 } }).action).toBe('warn');
    expect(step({ strikes: { home: STRIKES_TO_ASK, work: 0 } })).toMatchObject({ action: 'ask', kind: 'home' });
  });
  it('a kind in cancelled returns null for that kind only', () => {
    const w = { places: { home: HOME }, cancelled: ['home' as const] };
    expect(step(w).action).toBeNull();
    expect(step({ ...w, cancelled: ['work'] })).toMatchObject({ action: 'warn', kind: 'home' });
  });
  it('home and work 150 m apart: the nearer one is chosen', () => {
    const places = { home: HOME, work: WORK };
    expect(step({ places, pos: { lat: 52.0004, lng: 5 } })).toMatchObject({ action: 'warn', kind: 'home' });
    expect(step({ places, pos: { lat: 52.001, lng: 5 } })).toMatchObject({ action: 'ask', kind: 'work' });
  });
});
