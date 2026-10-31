import { describe, expect, it } from 'vitest';
import { tripChecks } from './tripReadiness';

describe('trip checks', () => {
  it('says whether today has a route', () => {
    expect(tripChecks({ route: { kind: 'mine', id: 'r', name: 'Coorg loop' }, pack: { total: 0, done: 0 } })[0]).toMatchObject({ label: 'Route today', status: 'good', word: 'Coorg loop' });
    expect(tripChecks({ pack: { total: 0, done: 0 } })[0]).toMatchObject({ status: 'caution', word: 'None chosen' });
  });
  it('counts the pack list, and says nothing is packed when there is no list', () => {
    expect(tripChecks({ pack: { total: 12, done: 12 } })[1]).toMatchObject({ label: 'Pack list', status: 'good', word: 'All packed' });
    expect(tripChecks({ pack: { total: 12, done: 9 } })[1]).toMatchObject({ status: 'caution', word: '9 of 12 packed' });
    expect(tripChecks({ pack: { total: 0, done: 0 } })[1]).toMatchObject({ status: 'caution', word: 'No list' });
  });
  it('never claims the ride is safe', () => {
    const words = tripChecks({ pack: { total: 1, done: 1 }, route: { kind: 'mine', id: 'r', name: 'x' } }).map((c) => c.word.toLowerCase()).join(' ');
    expect(words).not.toMatch(/safe|ready to ride/);
  });
});
