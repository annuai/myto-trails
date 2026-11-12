import { describe, expect, it } from 'vitest';
import { admits, GAP_DAYS, SEND_FROM_MIN, SEND_TO_MIN } from './governor';
import { dormant, fatigued, resolveHistory, typeWeight } from './learning';
import { candidates } from './candidates';
import { planNudges } from './planner';
import { variants, write } from './copy';
import { goodRidingDay, parseForecast, forecastUrl } from './weather';
import { at, DAY, isoOf, minuteOfDay } from './time';
import { FRIDAY, ride, world } from './testWorld';
import { NUDGE_TYPES, type NudgeHistory } from './types';
import { AWAY_M } from '@/lib/homeRoute/types';

const hist = (type: NudgeHistory['type'], daysAgo: number, opened = false): NudgeHistory => ({ id: `nudge:${type}:${daysAgo}`, type, fireAt: at(FRIDAY, -daysAgo, 10), ...(opened ? { opened: at(FRIDAY, -daysAgo, 11) } : {}) });
const sunny = (iso: string) => ({ iso, code: 0, tempMax: 28, rainPct: 5 });
const rainy = (iso: string) => ({ iso, code: 63, tempMax: 24, rainPct: 90 });
const days = (n: number, f: (iso: string) => ReturnType<typeof sunny>) => Array.from({ length: n }, (_, i) => f(isoOf(at(FRIDAY, i, 12))));

describe('weather', () => {
  it('knows a good riding day: dry, mild, not stormy', () => {
    expect(goodRidingDay(sunny('x'))).toBe(true);
    expect(goodRidingDay(rainy('x'))).toBe(false);
    expect(goodRidingDay({ iso: 'x', code: 0, tempMax: 40, rainPct: 0 })).toBe(false);
    expect(goodRidingDay({ iso: 'x', code: 1, tempMax: 10, rainPct: 0 })).toBe(false);
  });
  it('reads the service answer, rounds the temperature and drops a day with a missing number', () => {
    const json = { daily: { time: ['2026-11-07', '2026-11-08'], weather_code: [1, null], temperature_2m_max: [27.6, 30], precipitation_probability_max: [10, 20] } };
    expect(parseForecast(json)).toEqual([{ iso: '2026-11-07', code: 1, tempMax: 28, rainPct: 10 }]);
    expect(parseForecast(null)).toEqual([]);
    expect(parseForecast({})).toEqual([]);
  });
  it('asks about a place rounded to about 11 km, never the exact spot', () => {
    expect(forecastUrl(12.97163, 77.59462)).toContain('latitude=13&longitude=77.6');
  });
});

describe('copy', () => {
  it('has wordings for every type, wraps the variant, and never gives the reason on the lock screen', () => {
    for (const t of NUDGE_TYPES) {
      expect(variants(t)).toBeGreaterThan(0);
      const a = write(t, { daysSince: 7, toGo: 12, target: 500, club: 'Dust Devils', rideTitle: 'Nandi sunrise', going: 12, when: 'on Sunday', trail: 'Nandi Hills', day: 'Saturday', sky: 0, temp: 27 }, 0);
      expect(a.title.length).toBeGreaterThan(3);
      expect(a.lock).toBe('A ride idea');
      expect(write(t, {}, variants(t)).title).toBe(write(t, {}, 0).title);
    }
  });
  it('uses the facts', () => {
    expect(write('lapse', { daysSince: 7 }, 0).title).toBe("It's been a week");
    expect(write('lapse', { daysSince: 60 }, 0).title).toContain('couple of months');
    expect(write('milestone', { toGo: 12.4, target: 500 }, 0).title).toBe('12 km to 500 km this year');
    expect(write('club', { club: 'Dust Devils', rideTitle: 'Nandi sunrise', going: 12, when: 'on Sunday' }, 0).body).toContain('12 going');
  });
});

describe('candidates', () => {
  it('suggests the lapse ladder from the last ride: a week, three weeks and two months on, at 09:30', () => {
    const w = world({ rides: [ride(FRIDAY, 0, 7)] });
    const lapse = candidates(w).filter((c) => c.type === 'lapse');
    expect(lapse.map((c) => Math.round((c.fireAt - at(FRIDAY, 0, 9, 30)) / DAY))).toEqual([7, 21, 60]);
    expect(lapse.every((c) => minuteOfDay(c.fireAt) === 9 * 60 + 30)).toBe(true);
  });
  it('suggests the first-ride nudges only to someone who has never ridden', () => {
    expect(candidates(world({ rides: [] })).filter((c) => c.type === 'first')).toHaveLength(2);
    expect(candidates(world()).filter((c) => c.type === 'first')).toHaveLength(0);
  });
  it('suggests a Friday evening nudge, unless a trip or a club ride is planned that weekend or the weekend is wet', () => {
    const base = candidates(world()).filter((c) => c.type === 'weekend');
    expect(base).toHaveLength(2);
    expect(minuteOfDay(base[0]!.fireAt)).toBe(17 * 60 + 30);
    const sat = isoOf(at(FRIDAY, 1, 12));
    expect(candidates(world({ tripDays: [sat] })).filter((c) => c.type === 'weekend').map((c) => c.key)).not.toContain(`weekend:${isoOf(FRIDAY)}`);
    expect(candidates(world({ forecast: days(3, rainy) })).filter((c) => c.type === 'weekend').map((c) => c.key)).not.toContain(`weekend:${isoOf(FRIDAY)}`);
  });
  it('suggests a weather nudge the evening before a dry day, strongest for a weekend or a usual riding day, and not the day after a ride', () => {
    const w = world({ forecast: days(7, sunny), rides: [ride(FRIDAY, 0)] });
    const wx = candidates(w).filter((c) => c.type === 'weather');
    expect(wx.find((c) => c.key === `weather:${isoOf(at(FRIDAY, 1, 12))}`)).toBeUndefined();
    const sat = wx.find((c) => c.key === `weather:${isoOf(at(FRIDAY, 1, 12))}`);
    expect(sat).toBeUndefined();
    const tue = wx.find((c) => c.key === `weather:${isoOf(at(FRIDAY, 4, 12))}`)!;
    expect(tue.score).toBe(0.35);
    expect(candidates({ ...w, usualWeekdays: [2] }).find((c) => c.key === `weather:${isoOf(at(FRIDAY, 4, 12))}`)!.score).toBe(0.8);
    expect(candidates(world({ forecast: days(7, rainy) })).filter((c) => c.type === 'weather')).toHaveLength(0);
  });
  it('suggests a club ride nudge two days before, or the day before when it is closer, only for rides coming within four days', () => {
    const start = at(FRIDAY, 3, 6, 30);
    const c = candidates(world({ clubRides: [{ id: 'e1', title: 'Nandi sunrise', clubName: 'Dust Devils', startsAt: start, going: 12 }] })).filter((x) => x.type === 'club');
    expect(c).toHaveLength(1);
    expect(c[0]!.fireAt).toBe(at(start, -2, 18));
    expect(c[0]!.route).toBe('/event/e1');
    expect(candidates(world({ clubRides: [{ id: 'e2', title: 'x', clubName: 'y', startsAt: at(FRIDAY, 9, 6), going: 1 }] })).filter((x) => x.type === 'club')).toHaveLength(0);
  });
  it('suggests a milestone only when close to one, and not before a few kilometres have been ridden', () => {
    expect(candidates(world({ yearKm: 470 })).find((c) => c.type === 'milestone')).toMatchObject({ key: 'milestone:500', data: { toGo: 30, target: 500 } });
    expect(candidates(world({ yearKm: 300 })).find((c) => c.type === 'milestone')).toBeUndefined();
    expect(candidates(world({ yearKm: 5 })).find((c) => c.type === 'milestone')).toBeUndefined();
  });
  it('suggests a photos nudge only just after a ride, and only for someone in a club', () => {
    const r = ride(FRIDAY, 0, 8);
    const justAfter = { ...r, endedAt: FRIDAY - 5 * 60_000 };
    expect(candidates(world({ rides: [justAfter], clubs: 1 })).find((c) => c.type === 'photos')?.fireAt).toBe(justAfter.endedAt + 30 * 60_000);
    expect(candidates(world({ rides: [justAfter], clubs: 0 })).find((c) => c.type === 'photos')).toBeUndefined();
    expect(candidates(world({ rides: [{ ...r, endedAt: FRIDAY - 3 * 3_600_000 }], clubs: 1 })).find((c) => c.type === 'photos')).toBeUndefined();
  });
});

describe('home nudge', () => {
  const HOME = { lat: 12.97, lng: 77.59 };
  const FIVE_KM = { lat: 12.97 + 0.045, lng: 77.59 };
  const NEAR = { lat: 12.97 + 0.005, lng: 77.59 };
  const justEnded = { ...ride(FRIDAY, 0, 8), endedAt: FRIDAY - 5 * 60_000 };
  const homeCand = (o: Parameters<typeof world>[0]) => candidates(world({ rides: [justEnded], ...o })).filter((c) => c.type === 'home');
  it('a ride ending 5 km from Home yields one home candidate 10 minutes after', () => {
    const c = homeCand({ home: HOME, lastRideEnd: FIVE_KM });
    expect(c).toHaveLength(1);
    expect(c[0]).toEqual({ type: 'home', key: `home:${justEnded.endedAt}`, fireAt: justEnded.endedAt + 10 * 60_000, score: 0.6, route: '/(tabs)', data: {} });
  });
  it('no candidate without Home, or when the ride ended within AWAY_M of it', () => {
    expect(homeCand({ lastRideEnd: FIVE_KM })).toEqual([]);
    expect(homeCand({ home: HOME })).toEqual([]);
    expect(homeCand({ home: HOME, lastRideEnd: NEAR })).toEqual([]);
    expect(AWAY_M).toBeGreaterThan(500);
  });
  it('no candidate on a trip day, where Dash keeps its Ride home card away too', () => {
    expect(homeCand({ home: HOME, lastRideEnd: FIVE_KM, tripDays: [isoOf(justEnded.endedAt)] })).toEqual([]);
    expect(homeCand({ home: HOME, lastRideEnd: FIVE_KM, tripDays: [isoOf(at(FRIDAY, 1, 12))] })).toHaveLength(1);
  });
  it('no candidate after a group ride', () => {
    expect(homeCand({ home: HOME, lastRideEnd: FIVE_KM, lastRideGroup: true })).toEqual([]);
  });
  it('no candidate for a ride that ended long ago', () => {
    expect(homeCand({ home: HOME, lastRideEnd: FIVE_KM, rides: [{ ...justEnded, endedAt: FRIDAY - 3 * 3_600_000 }] })).toEqual([]);
  });
  it('the governor keeps the 08:00 to 21:00 window and one nudge a day for home like any other', () => {
    const c = (fireAt: number) => ({ type: 'home' as const, key: 'k', fireAt, score: 1, route: '/(tabs)', data: {} });
    const w = world();
    expect(admits(c(at(FRIDAY, 1, 7, 59)), [], w, false)).toBe(false);
    expect(admits(c(at(FRIDAY, 1, 8, 0)), [], w, false)).toBe(true);
    expect(admits(c(at(FRIDAY, 1, 21, 0)), [], w, false)).toBe(false);
    expect(admits(c(at(FRIDAY, 1, 18)), [{ type: 'weekend', fireAt: at(FRIDAY, 1, 9) }], w, false)).toBe(false);
    expect(admits(c(at(FRIDAY, 1, 10)), [], world({ history: [hist('photos', 2)] }), false)).toBe(false);
  });
  it('a home nudge ignored four times in a row rests for 21 days', () => {
    const four = [12, 11, 10, 9].map((d) => hist('home', d));
    const r = resolveHistory(four, [], FRIDAY);
    expect(dormant(r, 'home', FRIDAY)).toBe(true);
    expect(dormant(r, 'home', at(FRIDAY, 13, 12))).toBe(false);
    const plan = planNudges(world({ rides: [justEnded], home: HOME, lastRideEnd: FIVE_KM, history: [hist('home', 12), hist('home', 11), hist('home', 10), hist('home', 9)] }));
    expect(plan.some((n) => n.type === 'home')).toBe(false);
  });
});

describe('governor', () => {
  const cand = (type: 'weekend' | 'photos' | 'lapse', fireAt: number) => ({ type, key: 'k', fireAt, score: 1, route: '/', data: {} });
  it('never sends outside 08:00 to 21:00', () => {
    const w = world();
    expect(admits(cand('weekend', at(FRIDAY, 1, 7, 59)), [], w, false)).toBe(false);
    expect(admits(cand('weekend', at(FRIDAY, 1, 8, 0)), [], w, false)).toBe(true);
    expect(admits(cand('weekend', at(FRIDAY, 1, 20, 59)), [], w, false)).toBe(true);
    expect(admits(cand('weekend', at(FRIDAY, 1, 21, 0)), [], w, false)).toBe(false);
    expect(SEND_FROM_MIN).toBe(480);
    expect(SEND_TO_MIN).toBe(1260);
  });
  it('sends nothing at all when nudges are off', () => expect(admits(cand('weekend', at(FRIDAY, 1, 10)), [], world({ level: 'off' }), false)).toBe(false));
  it('keeps "ride" nudges a week apart on Occasional, three and a half days on Regular, and double that when the rider is tired of them', () => {
    const base = [{ type: 'weekend' as const, fireAt: at(FRIDAY, 1, 10) }];
    expect(admits(cand('lapse', at(FRIDAY, 6, 10)), base, world(), false)).toBe(false);
    expect(admits(cand('lapse', at(FRIDAY, 8, 10)), base, world(), false)).toBe(true);
    expect(admits(cand('lapse', at(FRIDAY, 4, 10)), base, world({ level: 'regular' }), false)).toBe(false);
    expect(admits(cand('lapse', at(FRIDAY, 5, 10)), base, world({ level: 'regular' }), false)).toBe(true);
    expect(admits(cand('lapse', at(FRIDAY, 8, 10)), base, world(), true)).toBe(false);
    expect(GAP_DAYS.occasional).toBe(7);
  });
  it('counts what was already shown, not only what is planned', () => {
    expect(admits(cand('lapse', at(FRIDAY, 2, 10)), [], world({ history: [hist('weekend', 3)] }), false)).toBe(false);
  });
  it('allows one nudge a day, and keeps three hours clear of any other reminder', () => {
    const w = world({ level: 'regular', others: [{ id: 'todo:a', fireAt: at(FRIDAY, 1, 12) }] });
    expect(admits(cand('weekend', at(FRIDAY, 1, 10, 30)), [], w, false)).toBe(false);
    expect(admits(cand('weekend', at(FRIDAY, 1, 15, 1)), [], w, false)).toBe(true);
    expect(admits(cand('photos', at(FRIDAY, 1, 18)), [{ type: 'weekend', fireAt: at(FRIDAY, 1, 9) }], world(), false)).toBe(false);
  });
  it('leaves a day with the rider\'s usual-time reminder alone', () => {
    const w = world({ others: [{ id: 'habit:2026-11-07:390', fireAt: at(FRIDAY, 1, 6, 20) }] });
    expect(admits(cand('weekend', at(FRIDAY, 1, 17)), [], w, false)).toBe(false);
    expect(admits(cand('weekend', at(FRIDAY, 2, 17)), [], w, false)).toBe(true);
  });
  it('keeps "after a ride" nudges four days apart, apart from the ride ones', () => {
    const w = world({ history: [hist('photos', 2)] });
    expect(admits(cand('photos', at(FRIDAY, 1, 10)), [], w, false)).toBe(false);
    expect(admits(cand('photos', at(FRIDAY, 3, 10)), [], w, false)).toBe(true);
    expect(admits(cand('weekend', at(FRIDAY, 1, 10)), [], w, false)).toBe(true);
  });
});

describe('learning', () => {
  it('judges a nudge a day later: opened, or followed by a ride within a day, is good', () => {
    const h = [hist('weekend', 5, true), hist('lapse', 4), hist('weather', 3), hist('club', 0)];
    const rides = [{ startedAt: at(FRIDAY, -3, 15), endedAt: at(FRIDAY, -3, 17), distanceKm: 20 }];
    const r = resolveHistory(h, rides, FRIDAY + 1000);
    expect(r.map((x) => [x.type, x.good])).toEqual([['weekend', true], ['lapse', false], ['weather', true]]);
  });
  it('trusts a type that works more and one that does not less', () => {
    const good = Array.from({ length: 5 }, (_, i) => hist('club', 20 + i, true));
    const bad = Array.from({ length: 5 }, (_, i) => hist('weather', 20 + i));
    const r = resolveHistory([...good, ...bad], [], FRIDAY);
    expect(typeWeight(r, 'club')).toBeGreaterThan(1.2);
    expect(typeWeight(r, 'weather')).toBeLessThan(0.7);
    expect(typeWeight(r, 'milestone')).toBe(1);
  });
  it('rests a type for three weeks after four ignored in a row, and calls the rider tired after three ignored of any type', () => {
    const four = [12, 11, 10, 9].map((d) => hist('weather', d));
    const r = resolveHistory(four, [], FRIDAY);
    expect(dormant(r, 'weather', FRIDAY)).toBe(true);
    expect(dormant(r, 'weather', at(FRIDAY, 20, 12))).toBe(false);
    expect(dormant(r, 'club', FRIDAY)).toBe(false);
    expect(fatigued(resolveHistory([hist('weather', 9), hist('club', 8), hist('lapse', 7)], [], FRIDAY))).toBe(true);
    expect(fatigued(resolveHistory([hist('weather', 9), hist('club', 8, true), hist('lapse', 7)], [], FRIDAY))).toBe(false);
  });
});

describe('planNudges', () => {
  it('plans nothing when off, and nothing for a type that is muted', () => {
    expect(planNudges(world({ level: 'off' }))).toEqual([]);
    expect(planNudges(world({ muted: NUDGE_TYPES })).length).toBe(0);
  });
  it('plans a Friday-evening weekend nudge for a rider who rode this week', () => {
    const plan = planNudges(world({ level: 'regular' })).filter((n) => n.type === 'weekend');
    expect(plan).toHaveLength(1);
    expect(plan[0]!.fireAt).toBe(at(FRIDAY, 0, 17, 30));
    expect(plan[0]).toMatchObject({ id: expect.stringMatching(/^nudge:weekend:weekend:2026-11-06:v0$/), route: '/trails', lock: 'A ride idea' });
  });
  it('on Occasional sends one ride nudge a week at most: the weekend one gives way to the stronger lapse one, and the other way round', () => {
    const types = planNudges(world()).map((n) => n.type);
    expect(types.filter((t) => t === 'weekend').length + types.filter((t) => t === 'lapse').length).toBeLessThanOrEqual(3);
    const plan = planNudges(world());
    for (let i = 1; i < plan.length; i++) expect(plan[i]!.fireAt - plan[i - 1]!.fireAt).toBeGreaterThanOrEqual(7 * DAY);
  });
  it('lets the stronger idea win where two cannot both be sent: a club ride beats the weekend nudge', () => {
    const start = at(FRIDAY, 2, 6, 30);
    const plan = planNudges(world({ level: 'regular', clubRides: [{ id: 'e1', title: 'Nandi sunrise', clubName: 'Dust Devils', startsAt: start, going: 12 }] }));
    expect(plan.map((n) => n.type)).toContain('club');
    expect(plan.map((n) => n.type)).not.toContain('weekend');
  });
  it('plans the lapse ladder for a rider who has stopped, out to two months, even beyond the week ahead', () => {
    const plan = planNudges(world({ rides: [ride(FRIDAY, 0)], level: 'regular' })).filter((n) => n.type === 'lapse');
    expect(plan).toHaveLength(3);
    expect(plan[2]!.fireAt).toBeGreaterThan(at(FRIDAY, 50, 0));
  });
  it('rotates the wording so the same line is not used twice in a row', () => {
    const a = planNudges(world({ rides: [ride(FRIDAY, 20)], history: [] })).find((n) => n.type === 'lapse');
    const b = planNudges(world({ rides: [ride(FRIDAY, 20)], history: [hist('lapse', 30)] })).find((n) => n.type === 'lapse');
    expect(a && b && a.title !== b.title).toBe(true);
  });
  it('goes quiet for a rider who ignores them: half as many when tired, none of a type that keeps failing', () => {
    const ignored = [hist('weather', 12), hist('weather', 11), hist('weather', 10), hist('weather', 9)];
    expect(planNudges(world({ history: ignored, forecast: days(7, sunny) })).some((n) => n.type === 'weather')).toBe(false);
  });
});

describe('standing nudge', () => {
  const standing = (aheadOf: number, nextGap?: number) => world({ standing: { aheadOf, region: 'your area', ...(nextGap !== undefined ? { nextGap } : {}) } });
  const std = (w: ReturnType<typeof world>) => candidates(w).filter((c) => c.type === 'standing');
  it('is absent with no standing, or when the rider is only just below the top half', () => {
    expect(std(world())).toEqual([]);
    expect(std(standing(49, 5))).toEqual([]);
  });
  it('comes on Monday at 09:30 at 50, keyed by the ISO week', () => {
    const c = std(standing(50, 12));
    expect(c).toHaveLength(1);
    expect(c[0]!.key).toBe('standing:2026-W46');
    expect(c[0]!.fireAt).toBe(at(FRIDAY, 3, 9, 30));
    expect(c[0]!.score).toBe(0.5);
    expect(c[0]!.route).toBe('/ride');
  });
  it('skips a Monday in the next calendar month, since it would say "this month" about a month just begun', () => {
    const sat = new Date(2026, 9, 31, 10, 0).getTime(); // Saturday 31 October; the next Monday is 2 November
    expect(std({ ...standing(80, 10), now: sat })).toEqual([]);
    const fri = new Date(2026, 10, 27, 10, 0).getTime(); // Friday 27 November; Monday 30 November is still November
    expect(std({ ...standing(80, 10), now: fri })[0]!.fireAt).toBe(at(fri, 3, 9, 30));
  });
  it('is planned for a rider at the top half, but not at level off or when muted', () => {
    // The weekend and lapse nudges are worth more and sit too close, so they are muted to see this one.
    const w = { ...standing(80, 10), rides: [ride(FRIDAY, 1)], muted: ['weekend' as const, 'lapse' as const] };
    expect(planNudges(w).some((n) => n.type === 'standing')).toBe(true);
    expect(planNudges({ ...w, level: 'off' })).toEqual([]);
    expect(planNudges({ ...w, muted: ['weekend', 'lapse', 'standing'] }).some((n) => n.type === 'standing')).toBe(false);
  });
  it('says how far, kindly, and keeps the lock line generic', () => {
    const a = write('standing', { aheadOf: 72, region: 'your area', nextGap: 12.4 }, 0);
    expect(a.title).toBe('You are ahead of 72% of riders near your area');
    expect(a.body).toBe('12 km more this month moves you up a band. A short loop does it.');
    expect(write('standing', { aheadOf: 72, region: 'your area' }, 0).body).toBe('Nice riding this month.');
    expect(write('standing', { aheadOf: 100, region: 'your area' }, 0).title).toBe('You are ahead of 99% of riders near your area');
    expect(a.lock).toBe('A ride idea');
    expect(a.title + a.body).not.toContain('!');
  });
});
