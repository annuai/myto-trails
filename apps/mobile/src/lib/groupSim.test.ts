import { describe, expect, it } from 'vitest';
import { haversine } from './geo';
import { noisyFix, alongAt, SIM_ME, SIM_ROUTE, SIM_SPEED_MPS, SIM_TRAIL, simMeAlong, simRiders } from './groupSim';
import { prepareTrail, turnAhead } from './trailGuide';

describe('the test route', () => {
  it('is a road of several kilometres with a point at least every 25 m', () => {
    expect(SIM_TRAIL.totalM).toBeGreaterThan(5000);
    for (let i = 1; i < SIM_ROUTE.length; i++) expect(haversine(SIM_ROUTE[i - 1]!, SIM_ROUTE[i]!)).toBeLessThan(25);
  });
  it('has turns for the guide to name, the first a right at the first corner', () => {
    const t = prepareTrail(SIM_ROUTE);
    expect(turnAhead(t, 600)?.dir).toBe('right');
  });
});

describe('simRiders', () => {
  const me = { name: 'You', status: 'ok' as const };
  it('lists Annuai (this phone) and Pranab, Jithin and Abha, all with a position', () => {
    const r = simRiders(0, 0, me);
    expect(r).toHaveLength(4);
    expect(r[0]!.id).toBe(SIM_ME);
    expect(r.map((x) => x.name)).toEqual(['You', 'Pranab', 'Jithin', 'Abha']);
    expect(r.every((x) => x.lat !== null && x.lng !== null)).toBe(true);
  });
  it('has Pranab ahead of this phone at the start', () => {
    expect(alongAt({ offsetM: 450, pace: 1.05 }, 0)).toBeGreaterThan(simMeAlong(0));
  });
  it('moves this phone along the route at its set speed and stops it at the end', () => {
    expect(simMeAlong(10)).toBe(10 * SIM_SPEED_MPS);
    expect(simMeAlong(1e6)).toBe(SIM_TRAIL.totalM);
  });
  it('plays the scripted signals: wait up, fuel, help, then all good', () => {
    const at = (s: number) => Object.fromEntries(simRiders(s, 0, me).map((x) => [x.name, x.status]));
    expect(at(10)).toMatchObject({ Jithin: 'ok', Abha: 'ok' });
    expect(at(50)).toMatchObject({ Jithin: 'wait_up' });
    expect(at(80)).toMatchObject({ Abha: 'fuel' });
    expect(at(160)).toMatchObject({ Jithin: 'help' });
    expect(at(300)).toMatchObject({ Jithin: 'ok', Abha: 'ok' });
  });
  it('rides a road it is given, at the speed it is given', () => {
    const road = prepareTrail([{ lat: 13, lng: 77 }, { lat: 13.1, lng: 77 }]);
    expect(simMeAlong(10, road, 20)).toBe(200);
    expect(simMeAlong(1e6, road, 20)).toBe(road.totalM);
    const [me] = simRiders(10, 0, { name: 'You', status: 'ok' }, road, 20);
    expect(me!.lat).toBeGreaterThan(13);
  });
  it('keeps a rider still while they stop for fuel', () => {
    const meera = { offsetM: -100, pace: 1.03, stop: { at: 70, for: 50 } };
    expect(alongAt(meera, 100)).toBe(alongAt(meera, 70));
    expect(alongAt(meera, 130)).toBeGreaterThan(alongAt(meera, 120));
  });
});

describe('titles in the simulated group', () => {
  const me = { name: 'You', status: 'ok' as const };
  const titles = (name: string, over?: Record<string, ('captain' | 'marshal' | 'medic' | 'sweep')[]>) => simRiders(0, 0, me, undefined, undefined, over).find((x) => x.name === name)!.titles;
  it('starts with Pranab as the medic and Jithin as the sweep, and nobody else titled', () => {
    expect(titles('Pranab')).toEqual(['medic']);
    expect(titles('Jithin')).toEqual(['sweep']);
    expect(titles('Abha')).toEqual([]);
    expect(titles('You')).toEqual([]);
  });
  it('lets the leader give a rider several titles, or none', () => {
    expect(titles('Pranab', { 'sim-pranab': ['medic', 'marshal'] })).toEqual(['medic', 'marshal']);
    expect(titles('Pranab', { 'sim-pranab': [] })).toEqual([]);
    expect(titles('You', { 'sim-me': ['captain'] })).toEqual(['captain']);
  });
  it('makes Annuai, this phone, the leader of the group', () => {
    const rs = simRiders(0, 0, me);
    expect(rs.filter((x) => x.role === 'leader').map((x) => x.id)).toEqual(['sim-me']);
  });
});

describe('passing the lead in the simulated group', () => {
  const me = { name: 'You', status: 'ok' as const };
  it('moves the crown to the rider chosen, and leaves exactly one leader', () => {
    const rs = simRiders(0, 0, me, undefined, undefined, {}, 'sim-pranab');
    expect(rs.filter((x) => x.role === 'leader').map((x) => x.id)).toEqual(['sim-pranab']);
    expect(rs.find((x) => x.id === 'sim-me')!.role).toBe('member');
  });
});

describe('noisyFix', () => {
  const p = { lat: 13, lng: 77 };
  const seeded = (xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]!; };
  it('moves a fix by no more than the limit', () => {
    for (const x of [0.2, 0.5, 0.9]) {
      const n = noisyFix(p, seeded([0.9, x, x]), 8, 0.1)!;
      expect(haversine(p, n)).toBeLessThanOrEqual(8.01);
    }
  });
  it('loses a fix now and then, and leaves the rest', () => {
    expect(noisyFix(p, seeded([0.05]), 8, 0.15)).toBeNull();
    expect(noisyFix(p, seeded([0.5, 0.5, 0.5]), 8, 0.15)).not.toBeNull();
  });
});
