import { describe, expect, it } from 'vitest';
import { clusterLabel, clusterMarks, type RiderMark } from './riderClusters';

const at = (id: string, name: string, lat: number, lng: number): RiderMark => ({ id, name, slot: 0, lat, lng });

describe('clusterMarks', () => {
  const a = at('a', 'Asha Rao', 12, 77), b = at('b', 'Ben', 12.0002, 77), far = at('c', 'Cy', 12.05, 77);

  it('keeps riders apart when they are far apart', () => {
    expect(clusterMarks([a, far], 15)).toHaveLength(2);
  });

  it('puts riders about 22 m apart together at street zoom', () => {
    const [c] = clusterMarks([a, b], 15);
    expect(c!.marks.map((m) => m.id)).toEqual(['a', 'b']);
    expect(clusterLabel(c!)).toBe('Asha +1');
  });

  it('never hides a rider who has asked for something inside a badge, and nobody joins theirs', () => {
    const help = { ...b, status: 'help' as const };
    const groups = clusterMarks([a, help, at('d', 'Di', 12.0001, 77)], 15);
    expect(groups.map((g) => g.marks.map((m) => m.id))).toEqual([['a', 'd'], ['b']]);
  });

  it('splits them again once zoomed in far enough', () => {
    expect(clusterMarks([a, b], 20)).toHaveLength(2);
  });

  it('keeps one marker per rider, none lost', () => {
    const many = Array.from({ length: 6 }, (_, i) => at(`r${i}`, `R${i}`, 12 + i * 0.00005, 77));
    const groups = clusterMarks(many, 15);
    expect(groups.flatMap((g) => g.marks)).toHaveLength(6);
    expect(groups).toHaveLength(1);
  });
});
