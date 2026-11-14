import { describe, expect, it } from 'vitest';
import { buildRow, classifyPlace } from './places';

describe('classifyPlace', () => {
  it('ranks settlements', () => {
    expect(classifyPlace({ place: 'city' })).toEqual({ kind: 'city', rank: 100 });
    expect(classifyPlace({ place: 'town' })).toEqual({ kind: 'town', rank: 80 });
    expect(classifyPlace({ place: 'village' })).toEqual({ kind: 'village', rank: 50 });
    expect(classifyPlace({ place: 'hamlet' })).toEqual({ kind: 'hamlet', rank: 30 });
  });
  it('classifies passes, peaks and landmarks', () => {
    expect(classifyPlace({ natural: 'saddle' })).toEqual({ kind: 'pass', rank: 60 });
    expect(classifyPlace({ natural: 'peak' })).toEqual({ kind: 'peak', rank: 55 });
    expect(classifyPlace({ tourism: 'attraction' })).toEqual({ kind: 'landmark', rank: 40 });
    expect(classifyPlace({ tourism: 'viewpoint' })).toEqual({ kind: 'landmark', rank: 40 });
  });
  it('ranks suburbs, districts and localities', () => {
    for (const place of ['suburb', 'neighbourhood']) expect(classifyPlace({ place })).toEqual({ kind: 'suburb', rank: 35 });
    for (const place of ['county', 'district', 'region', 'state_district']) expect(classifyPlace({ place })).toEqual({ kind: 'district', rank: 70 });
    for (const place of ['locality', 'island']) expect(classifyPlace({ place })).toEqual({ kind: 'landmark', rank: 40 });
  });
  it('counts water and beaches only with a wikidata or wikipedia tag', () => {
    expect(classifyPlace({ natural: 'beach' })).toBeNull();
    expect(classifyPlace({ natural: 'water' })).toBeNull();
    expect(classifyPlace({ natural: 'water', wikidata: 'Q1' })).toEqual({ kind: 'landmark', rank: 40 });
    expect(classifyPlace({ natural: 'beach', wikipedia: 'en:Palolem' })).toEqual({ kind: 'landmark', rank: 40 });
  });
  it('ignores everything else', () => {
    expect(classifyPlace({ highway: 'residential' })).toBeNull();
  });
});

describe('buildRow', () => {
  it('builds detail from district and state', () => {
    const row = buildRow(
      { place: 'village', name: 'Hampi', 'name:en': 'Hampi', 'is_in:district': 'Vijayanagara' },
      15.33,
      76.46,
      'Karnataka',
    );
    expect(row).toMatchObject({ name: 'Hampi', kind: 'village', rank: 50, lat: 15.33, lng: 76.46 });
    expect(row?.detail).toBe('Vijayanagara, Karnataka');
  });
  it('returns null without a name or class', () => {
    expect(buildRow({ place: 'village' }, 1, 2, 'Goa')).toBeNull();
    expect(buildRow({ name: 'X', highway: 'path' }, 1, 2, 'Goa')).toBeNull();
  });
  it('joins alternative names without duplicates', () => {
    const row = buildRow(
      { place: 'city', name: 'Mysuru', 'name:en': 'Mysore', 'name:kn': 'ಮೈಸೂರು', alt_name: 'Mysore' },
      12.3,
      76.6,
      'Karnataka',
    );
    expect(row?.alt).toBe('Mysore ಮೈಸೂರು');
    expect(row?.detail).toBe('Karnataka');
  });
  it('takes the other Indian scripts as alt names, deduplicated', () => {
    const row = buildRow({ place: 'city', name: 'Mysuru', 'name:ml': 'മൈസൂർ', 'name:hi': 'मैसूर', 'name:ta': 'மைசூர்', 'name:ur': 'मैसूर', 'name:or': 'ମାଇସୁର' }, 12.3, 76.6, 'Karnataka');
    expect(row?.alt).toBe('മൈസൂർ मैसूर மைசூர் ମାଇସୁର');
  });
});
