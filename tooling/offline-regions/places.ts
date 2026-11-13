// Pure place classification and row building for the offline region search file.
export type PlaceKind = 'city' | 'town' | 'village' | 'hamlet' | 'district' | 'pass' | 'peak' | 'landmark';

export interface PlaceRow {
  name: string;
  alt: string;
  kind: PlaceKind;
  detail: string;
  lat: number;
  lng: number;
  rank: number;
}

const PLACE_RANKS: Record<string, { kind: PlaceKind; rank: number }> = {
  city: { kind: 'city', rank: 100 },
  town: { kind: 'town', rank: 80 },
  village: { kind: 'village', rank: 50 },
  hamlet: { kind: 'hamlet', rank: 30 },
};

export function classifyPlace(tags: Record<string, string>): { kind: PlaceKind; rank: number } | null {
  const place = tags.place && PLACE_RANKS[tags.place];
  if (place) return { ...place };
  if (tags.natural === 'saddle') return { kind: 'pass', rank: 60 };
  if (tags.natural === 'peak') return { kind: 'peak', rank: 55 };
  if (tags.tourism === 'attraction' || tags.tourism === 'viewpoint') return { kind: 'landmark', rank: 40 };
  if (tags.natural === 'beach' || tags.natural === 'water') return { kind: 'landmark', rank: 40 };
  return null;
}

export function buildRow(tags: Record<string, string>, lat: number, lng: number, stateName: string): PlaceRow | null {
  const name = tags.name?.trim();
  if (!name) return null;
  const cls = classifyPlace(tags);
  if (!cls) return null;
  const seen = new Set([name]);
  const alts: string[] = [];
  for (const key of ['name:en', 'name:kn', 'alt_name']) {
    const v = tags[key]?.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      alts.push(v);
    }
  }
  const district = (tags['is_in:district'] || tags['addr:district'])?.trim();
  return {
    name,
    alt: alts.join(' '),
    kind: cls.kind,
    detail: district ? `${district}, ${stateName}` : stateName,
    lat,
    lng,
    rank: cls.rank,
  };
}
