import { describe, expect, it } from 'vitest';
import { decodeTrace, encodeTrace } from './motionTrace';

describe('motion trace', () => {
  it('round-trips evidence, drops ticks and survives a cut-off last line', () => {
    const text = encodeTrace([{ k: 'gps', t: 1, lat: 1, lng: 2, speed: 3, acc: 4, state: 'riding', conf: 0.9 }, { k: 'tick', t: 2 }, { k: 'shake', t: 3, vib: 0.1, stepHz: 0 }]);
    expect(text.split('\n')).toHaveLength(2);
    expect(decodeTrace(`${text}\n{"k":"gps","t":`).map((e) => e.k)).toEqual(['gps', 'shake']);
  });
});
