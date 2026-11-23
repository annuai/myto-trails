import { describe, expect, it } from 'vitest';
import { inColumn, type ColumnItem } from './columnItems';

const item = (key: string, side: 'left' | 'right', at?: number): ColumnItem => ({ key, node: null, side, at });

describe('inColumn', () => {
  // Bug: the You and Home pages put almost everything in one column and a little in the other in landscape.
  // The blocks are now assigned a side one by one, so a long list can sit beside the short ones.
  it('gives each column only its own blocks', () => {
    const items = [item('a', 'left'), item('b', 'right'), item('c', 'left')];
    expect(inColumn(items, 'left').map((i) => i.key)).toEqual(['a', 'c']);
    expect(inColumn(items, 'right').map((i) => i.key)).toEqual(['b']);
  });

  it('draws a column in list order unless a block says where it goes', () => {
    const items = [item('now', 'left'), item('lists', 'right', 1), item('latest', 'right', 0)];
    expect(inColumn(items, 'right').map((i) => i.key)).toEqual(['latest', 'lists']);
  });
});
