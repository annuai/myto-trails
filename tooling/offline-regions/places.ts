// Pure place classification and row building for the offline region search file.
export type PlaceKind = 'city' | 'town' | 'village' | 'hamlet' | 'suburb' | 'district' | 'pass' | 'peak' | 'landmark';

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
  suburb: { kind: 'suburb', rank: 35 },
  neighbourhood: { kind: 'suburb', rank: 35 },
  county: { kind: 'district', rank: 70 },
  district: { kind: 'district', rank: 70 },
  region: { kind: 'district', rank: 70 },
  state_district: { kind: 'district', rank: 70 },
  locality: { kind: 'landmark', rank: 40 },
  island: { kind: 'landmark', rank: 40 },
};

/** English, Kannada and the other main Indian scripts, plus the generic alternative name. */
const ALT_NAME_KEYS = ['name:en', 'name:kn', 'alt_name', ...['ml', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'pa', 'or', 'as', 'ur'].map((l) => `name:${l}`)];

export function classifyPlace(tags: Record<string, string>): { kind: PlaceKind; rank: number } | null {
  const place = tags.place && PLACE_RANKS[tags.place];
  if (place) return { ...place };
  if (tags.natural === 'saddle') return { kind: 'pass', rank: 60 };
  if (tags.natural === 'peak') return { kind: 'peak', rank: 55 };
  if (tags.tourism === 'attraction' || tags.tourism === 'viewpoint') return { kind: 'landmark', rank: 40 };
  // Every pond is `natural=water`; only ones with a wikidata or wikipedia tag are notable enough to search for.
  if ((tags.natural === 'beach' || tags.natural === 'water') && (tags.wikidata || tags.wikipedia)) return { kind: 'landmark', rank: 40 };
  return null;
}

export function buildRow(tags: Record<string, string>, lat: number, lng: number, stateName: string): PlaceRow | null {
  const name = tags.name?.trim();
  if (!name) return null;
  const cls = classifyPlace(tags);
  if (!cls) return null;
  const seen = new Set([name]);
  const alts: string[] = [];
  for (const key of ALT_NAME_KEYS) {
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
