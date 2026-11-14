/** One downloadable file: where it lives, how big, and its checksum so a bad download is caught. */
export type FileRef = { url: string; bytes: number; sha256: string };

/** A region the rider can download: a map file and a search file, both published together under one version. */
/** Manifests published before countries existed have none; every region in them is in India. */
export const DEFAULT_COUNTRY = 'India';

export type Region = { id: string; name: string; /** The country the region is listed under, so the screen can group by country. */ country: string; bbox: [number, number, number, number]; version: string; map: FileRef; search: FileRef };

/** What is on the phone for a region. Kept apart from `Region` because the manifest may move on while the files stay. */
export type Installed = { id: string; version: string; bbox: Region['bbox']; mapPath: string; searchPath: string };

const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseFile(v: unknown): FileRef | null {
  const f = v as Partial<Record<keyof FileRef, unknown>> | null;
  if (!f || typeof f !== 'object') return null;
  if (!text(f.url) || !text(f.sha256) || !num(f.bytes) || f.bytes < 0) return null;
  return { url: f.url, bytes: f.bytes, sha256: f.sha256 };
}

/** [west, south, east, north] in degrees; a box that is flipped, empty or off the globe is no use for hit-testing. */
function parseBbox(v: unknown): Region['bbox'] | null {
  if (!Array.isArray(v) || v.length !== 4 || !v.every(num)) return null;
  const [w, s, e, n] = v as number[];
  if (w < -180 || e > 180 || s < -90 || n > 90 || w >= e || s >= n) return null;
  return [w, s, e, n];
}

function parseRegion(v: unknown): Region | null {
  const r = v as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') return null;
  const bbox = parseBbox(r.bbox);
  const map = parseFile(r.map);
  const search = parseFile(r.search);
  if (!text(r.id) || !text(r.name) || !text(r.version) || !bbox || !map || !search) return null;
  // The id and version become file names under the regions folder, so nothing that could climb out of it gets through.
  if (!/^[a-z0-9-]+$/.test(r.id) || !/^[0-9A-Za-z.-]+$/.test(r.version) || r.version.includes('..')) return null;
  const country = text(r.country) && r.country.trim() ? r.country.trim().slice(0, 60) : DEFAULT_COUNTRY;
  return { id: r.id, name: r.name, country, bbox, version: r.version, map, search };
}

/** Regions from the published manifest. Null when it is not a format we know; a single bad or repeated region is dropped so one slip does not hide the rest. */
export function parseManifest(json: unknown): Region[] | null {
  const m = json as { format?: unknown; regions?: unknown } | null;
  if (!m || typeof m !== 'object' || m.format !== 1 || !Array.isArray(m.regions)) return null;
  const seen = new Set<string>();
  const out: Region[] = [];
  for (const raw of m.regions) {
    const region = parseRegion(raw);
    if (!region || seen.has(region.id)) continue;
    seen.add(region.id);
    out.push(region);
  }
  return out;
}

/** True only for a region already installed whose version differs; nothing installed means nothing to update. */
export function updateAvailable(region: Region, installed: Installed | undefined): boolean {
  return !!installed && installed.version !== region.version;
}

/** What a full download costs the rider in data, map and search together. */
export function regionTotalBytes(r: Region): number {
  return r.map.bytes + r.search.bytes;
}

/** The list as the screen shows it: one group per country (A to Z), and inside a group the regions on the phone first, then by name. */
export function groupByCountry(regions: Region[], onPhone: ReadonlySet<string>): { country: string; regions: Region[] }[] {
  const groups = new Map<string, Region[]>();
  for (const r of regions) groups.set(r.country, [...(groups.get(r.country) ?? []), r]);
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([country, list]) => ({ country, regions: [...list].sort((a, b) => Number(onPhone.has(b.id)) - Number(onPhone.has(a.id)) || a.name.localeCompare(b.name)) }));
}
