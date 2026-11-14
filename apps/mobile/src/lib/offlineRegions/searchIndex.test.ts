import { describe, expect, it } from 'vitest';
import { combine, ftsQuery, mergePlaces, rowToPlace, splitPath } from './searchIndex';
import type { Place } from '../placeSearch';

const p = (name: string, lat = 12, lng = 76): Place => ({ name, detail: '', point: { lat, lng } });

describe('ftsQuery', () => {
  it('quotes each token and stars the last', () => {
    expect(ftsQuery('mys')).toBe('"mys"*');
    expect(ftsQuery('coorg  hills')).toBe('"coorg" "hills"*');
  });
  it('splits on FTS operators and punctuation like the index does', () => {
    const q = ftsQuery('a"b*(c)-d:e')!;
    expect(q).toBe('"a" "b" "c" "d" "e"*');
    expect(q.replace(/"[^"]*"\*?/g, '').trim()).toBe('');
  });
  it('splits on hyphen, apostrophe and dot', () => {
    expect(ftsQuery('Hosa-halli')).toBe('"Hosa" "halli"*');
    expect(ftsQuery("St. Mary's")).toBe('"St" "Mary" "s"*');
    expect(ftsQuery('k.r.nagar')).toBe('"k" "r" "nagar"*');
  });
  it('is null when nothing is searchable', () => {
    for (const t of ['', '   ', '"*', '()-:', '***']) expect(ftsQuery(t)).toBeNull();
  });
  it('keeps non-Latin scripts, marks included', () => {
    expect(ftsQuery('ಮೈಸೂರು')).toBe('"ಮೈಸೂರು"*');
    expect(ftsQuery('मुंबई')).toBe('"मुंबई"*');
  });
  it('drops punctuation-only tokens but keeps the rest', () => {
    expect(ftsQuery('- goa')).toBe('"goa"*');
  });
});

describe('mergePlaces', () => {
  it('drops an online duplicate (same name, within 0.01 degrees), local first', () => {
    const out = mergePlaces([p('Hampi', 15.33, 76.46)], [p('hampi', 15.335, 76.465), p('Badami', 15.9, 75.7)], 6);
    expect(out.map((x) => x.name)).toEqual(['Hampi', 'Badami']);
  });
  it('keeps a same-named place that is far away', () => {
    expect(mergePlaces([p('Hampi', 15, 76)], [p('Hampi', 16, 77)], 6)).toHaveLength(2);
  });
  it('truncates to the limit', () => {
    expect(mergePlaces([p('a', 1, 1), p('b', 2, 2)], [p('c', 3, 3)], 2).map((x) => x.name)).toEqual(['a', 'b']);
  });
});

describe('combine', () => {
  it('merges local with a successful online answer', () => {
    expect(combine([p('a', 1, 1)], [p('b', 2, 2)], 6).map((x) => x.name)).toEqual(['a', 'b']);
  });
  it('returns local when online failed', () => {
    expect(combine([p('a')], new Error('down'), 6)).toEqual([p('a')]);
  });
  it('rethrows the online error when there is nothing local', () => {
    const e = new Error('down');
    expect(() => combine([], e, 6)).toThrow(e);
  });
});

describe('rowToPlace / splitPath', () => {
  it('maps a row', () => {
    expect(rowToPlace({ name: 'X', detail: 'Y', lat: 1, lng: 2 })).toEqual({ name: 'X', detail: 'Y', point: { lat: 1, lng: 2 } });
  });
  it('splits a file URI or a path into directory and file name', () => {
    expect(splitPath('file:///var/mobile/Documents/regions/goa.v2.search')).toEqual({ dir: '/var/mobile/Documents/regions', file: 'goa.v2.search' });
    expect(splitPath('/a/b/c.search')).toEqual({ dir: '/a/b', file: 'c.search' });
  });
});
