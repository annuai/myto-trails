import { ACCESS_CLASSES, DIFFICULTIES, SUITABILITIES, TERRAINS } from "@moto-trails/domain";
import { statusFor } from "@/ui/StatusBadge/status-map";
import { difficultyLabel, monthLabel, suggestionLabel, terrainLabel } from "../trail/labels";
import type { SearchParams } from "./search-params";

function activeCount(p: SearchParams): number {
  return p.terrain.length + p.difficulty.length + p.access.length + p.suitable.length + (p.verified ? 1 : 0) +
    (p.month ? 1 : 0) + (p.minKm !== undefined ? 1 : 0) + (p.maxKm !== undefined ? 1 : 0) + (p.showClosed ? 1 : 0);
}

function Checks<T extends string>({ legend, name, options, selected, label }: { legend: string; name: string; options: readonly T[]; selected: T[]; label: (v: T) => string }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {options.map((o) => (
          <label key={o} className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} className="h-5 w-5 accent-accent" />
            {label(o)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Filters as a plain GET form, so it works without JavaScript and every state is a shareable URL. */
export function FilterPanel({ params }: { params: SearchParams }) {
  const n = activeCount(params);
  const hidden: [string, string | undefined][] = [
    ["q", params.q || undefined],
    ["state", params.state],
    ["district", params.district],
    ["near", params.near],
    ["radius", params.near ? String(params.radius) : undefined],
    ["sort", params.sort],
    ["view", params.view === "map" ? "map" : undefined],
  ];
  return (
    <details open={n > 0} className="border-y border-border py-3">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium">Filters ({n})</summary>
      <form method="get" action="/trails" className="mt-4 flex flex-col gap-6">
        {hidden.map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
        <Checks legend="Terrain" name="terrain" options={TERRAINS} selected={params.terrain} label={terrainLabel} />
        <Checks legend="Difficulty" name="difficulty" options={DIFFICULTIES} selected={params.difficulty} label={difficultyLabel} />
        <Checks legend="Access" name="access" options={ACCESS_CLASSES} selected={params.access} label={(a) => statusFor("access", a).label} />
        <Checks legend="Suitable for" name="suitable" options={SUITABILITIES} selected={params.suitable} label={suggestionLabel} />
        <div className="flex flex-wrap gap-6">
          <div>
            <label htmlFor="f-month" className="block text-sm font-medium">Best month</label>
            <select id="f-month" name="month" defaultValue={params.month ? String(params.month) : ""} className="mt-1 min-h-11 border border-foreground/40 bg-background px-2">
              <option value="">Any month</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-min" className="block text-sm font-medium">Shortest (km)</label>
            <input id="f-min" name="minKm" type="number" min={0} max={5000} step="any" defaultValue={params.minKm} className="mt-1 min-h-11 w-28 border border-foreground/40 bg-background px-2" />
          </div>
          <div>
            <label htmlFor="f-max" className="block text-sm font-medium">Longest (km)</label>
            <input id="f-max" name="maxKm" type="number" min={0} max={5000} step="any" defaultValue={params.maxKm} className="mt-1 min-h-11 w-28 border border-foreground/40 bg-background px-2" />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="verified" value="1" defaultChecked={params.verified} className="h-5 w-5 accent-accent" />
            Verified only
          </label>
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="closed" value="1" defaultChecked={params.showClosed} className="h-5 w-5 accent-accent" />
            Include closed trails
          </label>
        </div>
        <button type="submit" className="min-h-11 self-start rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">
          Apply filters
        </button>
      </form>
    </details>
  );
}
