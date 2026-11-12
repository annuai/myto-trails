import { describe, expect, it } from 'vitest';
import { serviceLeft, withoutUntouchedExamples, type Todo } from './todos';

const todo = (id: string, over: Partial<Todo> = {}): Todo => ({ id, title: id, category: 'other', kind: 'date', done: false, ...over });

describe('withoutUntouchedExamples', () => {
  it('drops the old example to-dos the rider never touched', () => {
    expect(withoutUntouchedExamples([todo('seed-camera'), todo('seed-lube'), todo('seed-puc')])).toEqual([]);
  });

  it('keeps an example the rider ticked, edited or marked done, which all set updatedAt', () => {
    const kept = todo('seed-lube', { updatedAt: 1_700_000_000_000 });
    expect(withoutUntouchedExamples([todo('seed-puc'), kept])).toEqual([kept]);
  });

  it("never touches the rider's own to-dos, even ones that have not been edited", () => {
    const own = [todo('abc'), todo('def', { updatedAt: 5 })];
    expect(withoutUntouchedExamples(own)).toEqual(own);
  });
});

describe('serviceLeft', () => {
  const base = { id: 's', title: 'Chain lube', category: 'service', kind: 'service', done: false } as const;
  it('is undefined for a date to-do', () => {
    expect(serviceLeft({ ...base, kind: 'date' }, 0, '2026-06-10')).toBeUndefined();
  });
  it('is the smaller of the km share and the time share', () => {
    const t = { ...base, everyKm: 500, everyMonths: 3, lastDate: '2026-06-01', lastKm: 0 };
    expect(serviceLeft(t, 100, '2026-06-01')).toBeCloseTo(0.8, 5);
    expect(serviceLeft(t, 0, '2026-08-20')!).toBeLessThan(0.2);
  });
  it('stays between 0 and 1', () => {
    const t = { ...base, everyKm: 500, lastDate: '2026-06-01', lastKm: 0 };
    expect(serviceLeft(t, 9000, '2026-06-02')).toBe(0);
    expect(serviceLeft(t, 0, '2026-06-01')).toBe(1);
  });
});
