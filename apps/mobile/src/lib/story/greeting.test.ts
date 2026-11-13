import { describe, expect, it } from 'vitest';
import { DAY_MS, greetingDue, planGreeting } from './greeting';
import { isVisitId, visitOf, VISIT_IDS } from './visits';

describe('greeting plan', () => {
  it('a new rider waits 2 to 4 more opens and at least a day after the welcome flow', () => {
    expect(planGreeting('new', 1, 1000, () => 0)).toEqual({ opens: 3, at: 1000 + DAY_MS });
    expect(planGreeting('new', 1, 1000, () => 0.99)).toEqual({ opens: 5, at: 1000 + DAY_MS });
  });

  it('an existing rider gets it on one of their next 3 opens, with no waiting', () => {
    expect(planGreeting('existing', 1, undefined, () => 0)).toEqual({ opens: 2, at: 0 });
    expect(planGreeting('existing', 1, undefined, () => 0.99)).toEqual({ opens: 4, at: 0 });
  });

  it('is due only when both the opens and the time have been reached, and only once', () => {
    const plan = { opens: 3, at: 5000 };
    const s = { opens: 3, plan, greeted: false };
    expect(greetingDue({ ...s, opens: 2 }, 6000)).toBe(false);
    expect(greetingDue(s, 4000)).toBe(false);
    expect(greetingDue(s, 5000)).toBe(true);
    expect(greetingDue({ ...s, greeted: true }, 9000)).toBe(false);
    expect(greetingDue({ opens: 9, greeted: false }, 9000)).toBe(false);
  });
});

describe('visits', () => {
  it('has copy, a picture and a button for every visit, and no line is empty', () => {
    for (const id of VISIT_IDS) {
      const v = visitOf(id);
      expect(v.title.length).toBeGreaterThan(3);
      expect(v.body.length).toBeGreaterThan(10);
      expect(v.button.length).toBeGreaterThan(2);
      expect(v.pose).toBeTruthy();
    }
  });

  it('picks a line by the random number and never runs off the end', () => {
    expect(visitOf('hello', { rand: () => 0 }).title).not.toBe(visitOf('hello', { rand: () => 0.99 }).title);
    expect(() => visitOf('hello', { rand: () => 1 })).not.toThrow();
  });

  it('a map visit names its trip and opens it', () => {
    const v = visitOf('map', { trip: { id: 't1', name: 'Spiti loop' } });
    expect(v.body).toContain('Spiti loop');
    expect(v.route).toBe('/trips/t1');
  });

  it('knows its ids', () => {
    expect(isVisitId('rest')).toBe(true);
    expect(isVisitId('nope')).toBe(false);
  });

  it('never guilts or counts down', () => {
    const all = VISIT_IDS.flatMap((id) => [visitOf(id, { rand: () => 0 }), visitOf(id, { rand: () => 0.99 })]).map((v) => `${v.title} ${v.body}`.toLowerCase());
    for (const t of all) expect(t).not.toMatch(/miss|haven't|have not ridden|days since|only \d|hurry|last chance/);
  });
});
