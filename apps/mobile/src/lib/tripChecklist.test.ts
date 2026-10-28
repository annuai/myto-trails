import { describe, expect, it } from 'vitest';
import { newItems, STARTER_ITEMS } from './tripChecklist';

describe('newItems', () => {
  it('trims spaces and skips empty lines', () => {
    expect(newItems([], ['  Rain   gear ', '', '   '])).toEqual(['Rain gear']);
  });
  it('skips what is already there, whatever its case, and repeats within the list', () => {
    expect(newItems(['Rain gear'], ['rain GEAR', 'Torch', 'torch'])).toEqual(['Torch']);
  });
  it('shortens a very long line', () => {
    expect(newItems([], ['x'.repeat(200)])[0]).toHaveLength(80);
  });
  it('the starter list adds cleanly and only once', () => {
    expect(newItems([], STARTER_ITEMS)).toHaveLength(STARTER_ITEMS.length);
    expect(newItems(STARTER_ITEMS, STARTER_ITEMS)).toEqual([]);
  });
});
