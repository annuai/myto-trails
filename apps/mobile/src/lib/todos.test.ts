import { describe, expect, it } from 'vitest';
import { withoutUntouchedExamples, type Todo } from './todos';

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
