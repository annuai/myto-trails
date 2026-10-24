import Link from "next/link";
import { statusFor } from "@/ui/StatusBadge/status-map";
import { DEFAULT_RADIUS_KM, defaultSort, toSearchString, type SearchParams } from "./search-params";
import { difficultyLabel, monthLabel, suggestionLabel, terrainLabel } from "../trail/labels";

type Chip = { key: string; label: string; removeName: string; next: SearchParams };

const titleFromSlug = (slug: string) => slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const base: SearchParams = {
  q: "", terrain: [], difficulty: [], access: [], suitable: [], verified: false, radius: DEFAULT_RADIUS_KM,
  sort: "recent", showClosed: false, view: "list", page: 1,
};

function chips(p: SearchParams, placeName?: string): Chip[] {
  const out: Chip[] = [];
  const add = (key: string, label: string, removeName: string, patch: Partial<SearchParams>) => {
    const next: SearchParams = { ...p, ...patch, page: 1 };
    // A sort that was only the default for the old query should follow the new default.
    if (p.sort === defaultSort(p)) next.sort = defaultSort(next);
    out.push({ key, label, removeName, next });
  };
  if (p.q) add("q", `Search: ${p.q}`, `Remove search ${p.q}`, { q: "" });
  if (p.state) add("state", titleFromSlug(p.state), `Remove ${titleFromSlug(p.state)} filter`, { state: undefined, district: undefined });
  if (p.district) add("district", titleFromSlug(p.district), `Remove ${titleFromSlug(p.district)} filter`, { district: undefined });
  if (p.near) {
    const where = p.near === "me" ? "your location" : (placeName ?? titleFromSlug(p.near));
    add("near", `Within ${p.radius} km of ${where}`, "Remove location filter", { near: undefined });
  }
  for (const t of p.terrain) add(`t-${t}`, terrainLabel(t), `Remove ${terrainLabel(t)} filter`, { terrain: p.terrain.filter((x) => x !== t) });
  for (const d of p.difficulty) add(`d-${d}`, difficultyLabel(d), `Remove ${difficultyLabel(d)} filter`, { difficulty: p.difficulty.filter((x) => x !== d) });
  for (const a of p.access) {
    const label = statusFor("access", a).label;
    add(`a-${a}`, label, `Remove ${label} filter`, { access: p.access.filter((x) => x !== a) });
  }
  for (const s of p.suitable) add(`s-${s}`, suggestionLabel(s), `Remove ${suggestionLabel(s)} filter`, { suitable: p.suitable.filter((x) => x !== s) });
  if (p.verified) add("verified", "Verified only", "Remove Verified only filter", { verified: false });
  if (p.month) add("month", `Best in ${monthLabel(p.month)}`, `Remove Best in ${monthLabel(p.month)} filter`, { month: undefined });
  if (p.minKm !== undefined) add("minKm", `At least ${p.minKm} km`, `Remove At least ${p.minKm} km filter`, { minKm: undefined });
  if (p.maxKm !== undefined) add("maxKm", `At most ${p.maxKm} km`, `Remove At most ${p.maxKm} km filter`, { maxKm: undefined });
  if (p.showClosed) add("closed", "Including closed trails", "Remove Including closed trails filter", { showClosed: false });
  return out;
}

const href = (p: SearchParams) => {
  const qs = toSearchString(p);
  return qs ? `/trails?${qs}` : "/trails";
};

/** Every active filter as removable text, so nothing is hidden. */
export function ActiveFilterList({ params, placeName }: { params: SearchParams; placeName?: string }) {
  const items = chips(params, placeName);
  if (items.length === 0) return null;
  return (
    <ul aria-label="Active filters" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((c) => (
        <li key={c.key} className="flex items-center gap-1 text-sm">
          <span>{c.label}</span>
          <Link href={href(c.next)} aria-label={c.removeName} className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted underline underline-offset-4">
            <span aria-hidden="true">×</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href={href({ ...base, view: params.view })} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
          Clear all
        </Link>
      </li>
    </ul>
  );
}
