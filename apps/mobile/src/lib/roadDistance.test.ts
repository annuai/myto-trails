import { describe, expect, it } from 'vitest';
import { parseTable, tableUrl } from './roadDistance';

describe('tableUrl', () => {
  it('puts the rider first, longitude before latitude, and asks for distances from that one source', () => {
    expect(tableUrl({ lat: 12.5, lng: 77.5 }, [{ lat: 13, lng: 78 }])).toBe('https://router.project-osrm.org/table/v1/driving/77.50000,12.50000;78.00000,13.00000?sources=0&annotations=distance');
  });
});
describe('parseTable', () => {
  it('turns metres into kilometres, skipping the rider\'s own zero', () => {
    expect(parseTable({ distances: [[0, 12_500, null]] }, 2)).toEqual([12.5, null]);
  });
  it('gives no answer for a body that is not the expected shape', () => {
    expect(parseTable({ code: 'Error' }, 2)).toBeUndefined();
    expect(parseTable({ distances: [[0, 1]] }, 2)).toBeUndefined();
  });
});
