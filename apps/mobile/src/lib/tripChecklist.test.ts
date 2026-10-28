import { describe, expect, it } from 'vitest';
import { progress, STARTER_ITEMS, withItems } from './tripChecklist';

describe('trip checklist', () => {
  it('adds items, trimming spaces and skipping empty lines', () => {
    const l = withItems(undefined, ['  Rain   gear ', '', '   ']);
    expect(l.map((i) => [i.text, i.done])).toEqual([['Rain gear', false]]);
  });
  it('skips an item already on the list, whatever its case', () => {
    const l = withItems(withItems(undefined, ['Rain gear']), ['rain GEAR', 'Torch']);
    expect(l.map((i) => i.text)).toEqual(['Rain gear', 'Torch']);
  });
  it('keeps what is already ticked', () => {
    const first = withItems(undefined, ['Torch']).map((i) => ({ ...i, done: true }));
    expect(withItems(first, ['Cash']).map((i) => i.done)).toEqual([true, false]);
  });
  it('shortens a very long line', () => {
    expect(withItems(undefined, ['x'.repeat(200)])[0]!.text).toHaveLength(80);
  });
  it('the starter list adds cleanly and counts progress', () => {
    const l = withItems(undefined, STARTER_ITEMS);
    expect(l).toHaveLength(STARTER_ITEMS.length);
    expect(progress([{ ...l[0]!, done: true }, l[1]!])).toEqual({ done: 1, total: 2 });
    expect(progress(undefined)).toEqual({ done: 0, total: 0 });
  });
});
