// Pure place classification and row building for the offline region search file.
export type PlaceKind = 'city' | 'town' | 'village' | 'hamlet' | 'suburb' | 'district' | 'pass' | 'peak' | 'landmark' | 'fuel' | 'stay' | 'food' | 'health' | 'transport' | 'repair' | 'bank' | 'police';

/**
 * One searchable place in a region's offline search file. `alt` holds extra words a search can match (other-script names for a mapped
 * place, the kind's words for a business); `detail` is the locality or district and the state, shown under the name.
 */
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

/**
 * What kind of place an OpenStreetMap feature is and how high it ranks in search (bigger settlements first), or null when it is not worth
 * searching for.
 */
export function classifyPlace(tags: Record<string, string>): { kind: PlaceKind; rank: number } | null {
  const place = tags.place && PLACE_RANKS[tags.place];
  if (place) return { ...place };
  if (tags.natural === 'saddle') return { kind: 'pass', rank: 60 };
  if (tags.natural === 'peak') return { kind: 'peak', rank: 55 };
  if (tags.tourism === 'attraction' || tags.tourism === 'viewpoint') return { kind: 'landmark', rank: 40 };
  // Named parks and reserves are what people search for (Cubbon Park, a national park); ranked above the businesses around them.
  if (tags.leisure === 'park' || tags.leisure === 'nature_reserve' || tags.leisure === 'garden' || tags.boundary === 'national_park') return { kind: 'landmark', rank: 50 };
  // Every pond is `natural=water`; only ones with a wikidata or wikipedia tag are notable enough to search for.
  if ((tags.natural === 'beach' || tags.natural === 'water') && (tags.wikidata || tags.wikipedia)) return { kind: 'landmark', rank: 40 };
  return null;
}

/** Builds the search row for an OpenStreetMap feature, or null when it has no name or is not a place worth listing. */
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

/** One Overture Maps place as `overture.py` writes it: the taxonomy path, not the old category list. */
export interface OverturePlace {
  name?: string | null;
  /** Taxonomy path, broad to narrow, e.g. ["travel_and_transportation", "fueling_station"]. */
  h?: string[] | null;
  cat?: string | null;
  confidence?: number | null;
  status?: string | null;
  locality?: string | null;
  lat: number;
  lng: number;
}

/** Below this Overture's own confidence says the place probably is not real or has moved. */
export const OVERTURE_MIN_CONFIDENCE = 0.4;

/**
 * What a rider looks for on the road, and nothing else (Overture lists web designers and estate agents too). Matched on the taxonomy path;
 * the first rule that fits wins. Ranks stay under towns, passes and peaks (settlements 30 to 100, peaks 55, passes 60), so a business
 * never outranks the place it is in; confidence adds up to 8 to order the businesses among themselves.
 */
const OVERTURE_RULES: { kind: PlaceKind; rank: number; test: (h: string[], cat: string) => boolean }[] = [
  { kind: 'fuel', rank: 42, test: (h) => h.includes('fueling_station') || h.includes('ev_charging_station') },
  { kind: 'repair', rank: 36, test: (h, cat) => h.includes('vehicle_service') && /motorcycle|automotive_repair|tire|mechanic/.test(h.join(' ') + cat) },
  { kind: 'repair', rank: 36, test: (h, cat) => /motorcycle/.test(h.join(' ') + cat) },
  { kind: 'health', rank: 40, test: (h) => h.includes('hospital') || h.includes('pharmacy') || h.includes('emergency_room') },
  { kind: 'police', rank: 38, test: (h) => h.includes('police_department') },
  { kind: 'transport', rank: 44, test: (h) => h[0] === 'travel_and_transportation' && h.some((x) => /airport|railway|train_station|bus_station|bus_stop|ferry_terminal|transportation_hub/.test(x)) },
  { kind: 'bank', rank: 30, test: (h) => h.includes('atm') || h.includes('bank_or_credit_union') },
  { kind: 'stay', rank: 34, test: (h) => h[0] === 'lodging' },
  { kind: 'food', rank: 35, test: (h) => h[0] === 'food_and_drink' && !h.includes('alcoholic_beverage_venue') },
  { kind: 'landmark', rank: 40, test: (h) => h[0] === 'cultural_and_historic' || h[0] === 'geographic_entities' || (h[0] === 'sports_and_recreation' && (h.includes('park') || h.includes('beach'))) },
];

/** What a rider types for a kind of place instead of a name ("petrol pump", "bike repair"). Indexed with the name, so those searches find it. */
const KIND_WORDS: Partial<Record<PlaceKind, string>> = {
  fuel: 'petrol pump fuel station gas diesel ev charging',
  repair: 'bike repair motorcycle garage mechanic service showroom',
  health: 'hospital clinic pharmacy medical emergency',
  police: 'police station',
  bank: 'atm bank cash',
  stay: 'hotel stay lodge resort hostel homestay',
  food: 'restaurant food cafe eat',
};

/**
 * Builds the search row for an Overture Maps place, or null when it has no usable name or position, is closed, has too low a confidence, or
 * is in a category the search does not list.
 */
export function buildOvertureRow(p: OverturePlace, stateName: string): PlaceRow | null {
  const name = p.name?.trim();
  if (!name || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  if (p.status === 'permanently_closed' || p.status === 'temporarily_closed') return null;
  const confidence = p.confidence ?? 0;
  if (confidence < OVERTURE_MIN_CONFIDENCE) return null;
  const h = p.h ?? [];
  const rule = OVERTURE_RULES.find((r) => r.test(h, p.cat ?? ''));
  if (!rule) return null;
  const locality = p.locality?.trim();
  return {
    name,
    alt: [KIND_WORDS[rule.kind], p.cat?.replace(/_/g, ' ')].filter(Boolean).join(' '),
    kind: rule.kind,
    detail: locality && locality !== name && locality !== stateName ? `${locality}, ${stateName}` : stateName,
    lat: p.lat,
    lng: p.lng,
    rank: rule.rank + Math.round(Math.min(1, confidence) * 8),
  };
}

const CELL = 0.003;
const cell = (v: number): number => Math.round(v / CELL);

/** The grid cell (about 330 m) a place of this name sits in. */
export const dedupeKey = (name: string, lat: number, lng: number): string => `${name.toLowerCase()}|${cell(lat)}|${cell(lng)}`;

/** The cell and its eight neighbours, so two entries for one place are caught even when they fall either side of a cell edge. */
export function dedupeKeys(name: string, lat: number, lng: number): string[] {
  const out: string[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push(`${name.toLowerCase()}|${cell(lat) + dy}|${cell(lng) + dx}`);
  return out;
}
