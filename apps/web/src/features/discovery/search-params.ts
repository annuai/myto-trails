import {
  ACCESS_CLASSES, DIFFICULTIES, SUITABILITIES, TERRAINS, isValidSlug,
  type AccessClass, type Difficulty, type Suitability, type Terrain,
} from "@moto-trails/domain";

export const SORT_MODES = ["relevance", "nearest", "recent", "distance", "difficulty"] as const;
export type SortMode = (typeof SORT_MODES)[number];
export const RADIUS_OPTIONS = [25, 50, 100, 150, 200, 300] as const;
export const DEFAULT_RADIUS_KM = 150;
export const MAX_PAGE = 1000;
export const PAGE_SIZE = 20;
const MAX_QUERY_LENGTH = 100;
const MAX_KM = 5000;

export type SearchParams = {
  q: string;
  /** ISO 3166-1 alpha-2, upper case. Absent means every open country. */
  country?: string;
  state?: string;
  district?: string;
  /** A place slug, or "me" for the rider's own location (coordinates are never part of the URL). */
  near?: string;
  radius: number;
  terrain: Terrain[];
  difficulty: Difficulty[];
  access: AccessClass[];
  suitable: Suitability[];
  verified: boolean;
  month?: number;
  minKm?: number;
  maxKm?: number;
  showClosed: boolean;
  sort: SortMode;
  view: "list" | "map";
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

function list<T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T[] {
  const parts = (Array.isArray(v) ? v : v === undefined ? [] : [v]).flatMap((s) => s.split(","));
  return [...new Set(parts.map((p) => p.trim()).filter((p): p is T => (allowed as readonly string[]).includes(p)))];
}

const slug = (v: string | undefined) => (v !== undefined && isValidSlug(v) ? v : undefined);

function km(v: string | undefined): number | undefined {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(n, MAX_KM);
}

/** The sort used when none is given: nearest with a place, relevance with text, otherwise most recent. */
export function defaultSort(p: Pick<SearchParams, "q" | "near">): SortMode {
  return p.near ? "nearest" : p.q ? "relevance" : "recent";
}

/** Whether the result can be shared between visitors: "near me" depends on the rider's own position, everything else does not. */
export function isShareableSearch(p: SearchParams): boolean {
  return p.near !== "me";
}

/** Reads search state from URL parameters. Never throws: unknown or invalid values are dropped. */
export function parseSearchParams(raw: Raw): SearchParams {
  const q = (first(raw.q) ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const nearRaw = first(raw.near);
  const near = nearRaw === "me" ? "me" : slug(nearRaw);
  const radiusN = Number(first(raw.radius));
  const radius = (RADIUS_OPTIONS as readonly number[]).includes(radiusN) ? radiusN : DEFAULT_RADIUS_KM;
  const monthN = Number(first(raw.month));
  const sortRaw = first(raw.sort);
  const pageN = Math.floor(Number(first(raw.page)));

  const base = {
    q,
    country: /^[A-Za-z]{2}$/.test(first(raw.country) ?? "") ? first(raw.country)!.toUpperCase() : undefined,
    state: slug(first(raw.state)),
    district: slug(first(raw.district)),
    near,
    radius,
    terrain: list(raw.terrain, TERRAINS),
    difficulty: list(raw.difficulty, DIFFICULTIES),
    access: list(raw.access, ACCESS_CLASSES),
    suitable: list(raw.suitable, SUITABILITIES),
    verified: ["1", "true"].includes(first(raw.verified) ?? ""),
    month: Number.isInteger(monthN) && monthN >= 1 && monthN <= 12 ? monthN : undefined,
    minKm: km(first(raw.minKm)),
    maxKm: km(first(raw.maxKm)),
    showClosed: first(raw.closed) === "1",
    view: first(raw.view) === "map" ? ("map" as const) : ("list" as const),
    page: Number.isFinite(pageN) ? Math.min(Math.max(pageN, 1), MAX_PAGE) : 1,
  };
  const sort = (SORT_MODES as readonly string[]).includes(sortRaw ?? "") ? (sortRaw as SortMode) : defaultSort(base);
  const result: SearchParams = { ...base, sort };
  // Keep the object free of undefined keys so equality and round trips are straightforward.
  for (const key of Object.keys(result) as (keyof SearchParams)[]) if (result[key] === undefined) delete result[key];
  return result;
}

/** Serialises to a query string: defaults are omitted and keys come in a fixed order. */
export function toSearchString(p: SearchParams): string {
  const out = new URLSearchParams();
  if (p.q) out.set("q", p.q);
  if (p.country) out.set("country", p.country);
  if (p.state) out.set("state", p.state);
  if (p.district) out.set("district", p.district);
  if (p.near) out.set("near", p.near);
  if (p.near && p.radius !== DEFAULT_RADIUS_KM) out.set("radius", String(p.radius));
  if (p.terrain.length) out.set("terrain", p.terrain.join(","));
  if (p.difficulty.length) out.set("difficulty", p.difficulty.join(","));
  if (p.access.length) out.set("access", p.access.join(","));
  if (p.suitable.length) out.set("suitable", p.suitable.join(","));
  if (p.verified) out.set("verified", "1");
  if (p.month) out.set("month", String(p.month));
  if (p.minKm !== undefined) out.set("minKm", String(p.minKm));
  if (p.maxKm !== undefined) out.set("maxKm", String(p.maxKm));
  if (p.showClosed) out.set("closed", "1");
  if (p.sort !== defaultSort(p)) out.set("sort", p.sort);
  if (p.view === "map") out.set("view", "map");
  if (p.page > 1) out.set("page", String(p.page));
  return out.toString();
}
