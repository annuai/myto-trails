import { describe, expect, it } from 'vitest';
import { pickMoment, type Moment, type Surface } from './moment';

const m = (id: string): Moment => ({ id, kind: 'mark', title: id, body: '', pose: 'hello' });
const ctx = (over: Partial<{ surface: Surface; shownThisSession: string[]; seen: string[] }> = {}) => ({ surface: 'ride-end' as Surface, shownThisSession: [], seen: [], ...over });

describe('pickMoment', () => {
  it('is silent on ride, navigate and error whatever the candidates', () => {
    for (const surface of ['ride', 'navigate', 'error'] as const) expect(pickMoment([m('a')], ctx({ surface }))).toBeUndefined();
  });
  it('shows at most one Moment per session', () => {
    expect(pickMoment([m('a')], ctx({ shownThisSession: ['x'] }))).toBeUndefined();
  });
  it('never repeats a seen id', () => {
    expect(pickMoment([m('a'), m('b')], ctx({ seen: ['a'] }))?.id).toBe('b');
    expect(pickMoment([m('a')], ctx({ seen: ['a'] }))).toBeUndefined();
  });
  it('returns the first remaining candidate on a calm surface', () => {
    for (const surface of ['ride-end', 'dash', 'year'] as const) expect(pickMoment([m('a'), m('b')], ctx({ surface }))?.id).toBe('a');
    expect(pickMoment([], ctx())).toBeUndefined();
  });
});
