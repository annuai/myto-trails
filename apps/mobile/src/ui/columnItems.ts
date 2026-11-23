import type { ReactNode } from 'react';

/** One block of a page for the `items` form: which landscape column it sits in, and where in that column (default: its place in the list). */
export type ColumnItem = { key: string; node: ReactNode; side: 'left' | 'right'; at?: number };

/** The blocks of one landscape column, in the order they are drawn: by `at`, else by their place in the list. */
export function inColumn(items: ColumnItem[], side: ColumnItem['side']): ColumnItem[] {
  return items.map((i, n) => ({ i, at: i.at ?? n })).filter((x) => x.i.side === side).sort((a, b) => a.at - b.at).map((x) => x.i);
}
