import { describe, expect, it } from 'vitest';
import { buildOvertureRow, buildRow, classifyPlace, dedupeKey, dedupeKeys } from './places';

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
  it('ranks named parks and reserves above the businesses around them but below peaks', () => {
    for (const leisure of ['park', 'nature_reserve', 'garden']) expect(classifyPlace({ leisure })).toEqual({ kind: 'landmark', rank: 50 });
    expect(classifyPlace({ boundary: 'national_park' })).toEqual({ kind: 'landmark', rank: 50 });
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

describe('buildOvertureRow', () => {
  const base = { name: 'Shell Petrol Pump', h: ['travel_and_transportation', 'fueling_station'], cat: 'fueling_station', confidence: 0.9, locality: 'Panaji', lat: 15.5, lng: 73.8 };
  it('keeps what a rider looks for, with the locality and state', () => {
    expect(buildOvertureRow(base, 'Goa')).toMatchObject({ name: 'Shell Petrol Pump', kind: 'fuel', detail: 'Panaji, Goa', lat: 15.5, lng: 73.8 });
  });
  it('maps the other kinds', () => {
    const kind = (h: string[], cat = h[h.length - 1]!) => buildOvertureRow({ ...base, h, cat }, 'Goa')?.kind;
    expect(kind(['lodging', 'hotel'])).toBe('stay');
    expect(kind(['food_and_drink', 'restaurant'])).toBe('food');
    expect(kind(['health_care', 'hospital'])).toBe('health');
    expect(kind(['cultural_and_historic', 'place_of_worship'])).toBe('landmark');
    expect(kind(['travel_and_transportation', 'vehicle_service', 'motorcycle_repair'])).toBe('repair');
    expect(kind(['services_and_business', 'financial_service', 'atm'])).toBe('bank');
  });
  it('drops what is not for the road, closed places and doubtful ones', () => {
    expect(buildOvertureRow({ ...base, h: ['services_and_business', 'real_estate_service'] }, 'Goa')).toBeNull();
    expect(buildOvertureRow({ ...base, h: ['food_and_drink', 'alcoholic_beverage_venue'] }, 'Goa')).toBeNull();
    expect(buildOvertureRow({ ...base, status: 'permanently_closed' }, 'Goa')).toBeNull();
    expect(buildOvertureRow({ ...base, confidence: 0.2 }, 'Goa')).toBeNull();
    expect(buildOvertureRow({ ...base, name: ' ' }, 'Goa')).toBeNull();
    expect(buildOvertureRow({ ...base, h: null }, 'Goa')).toBeNull();
  });
  it('ranks a business below any settlement, peak or pass, and a surer one higher', () => {
    const hi = buildOvertureRow(base, 'Goa')!.rank;
    const lo = buildOvertureRow({ ...base, confidence: 0.4 }, 'Goa')!.rank;
    expect(hi).toBeGreaterThan(lo);
    expect(hi).toBeLessThan(55);
  });
  it('indexes the words a rider uses for the kind, so "petrol pump" finds a fuel station', () => {
    expect(buildOvertureRow(base, 'Goa')!.alt).toContain('petrol pump');
    expect(buildOvertureRow({ ...base, h: ['food_and_drink', 'restaurant', 'indian_restaurant'], cat: 'indian_restaurant' }, 'Goa')!.alt).toContain('indian restaurant');
  });
  it('uses just the state when the locality is missing or is the name itself', () => {
    expect(buildOvertureRow({ ...base, locality: null }, 'Goa')!.detail).toBe('Goa');
    expect(buildOvertureRow({ ...base, locality: 'Shell Petrol Pump' }, 'Goa')!.detail).toBe('Goa');
  });
});

describe('dedupeKeys', () => {
  it('finds the same name within about 100 m, either side of a cell edge, ignoring case', () => {
    const seen = new Set([dedupeKey('Fort Aguada', 15.4925, 73.7737)]);
    expect(dedupeKeys('fort aguada', 15.4921, 73.7734).some((k) => seen.has(k))).toBe(true);
    expect(dedupeKeys('Fort Aguada', 15.5925, 73.7737).some((k) => seen.has(k))).toBe(false);
    expect(dedupeKeys('Other', 15.4925, 73.7737).some((k) => seen.has(k))).toBe(false);
  });
});
