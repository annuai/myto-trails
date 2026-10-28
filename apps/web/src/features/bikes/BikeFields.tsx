"use client";

import { useEffect, useState } from "react";
import type { BikeMakeList, BikeModel, BikeModelPage } from "@moto-trails/domain";
import { BikeImage } from "./BikeImage";

type Initial = { name: string; modelYear: number | null; photoUrl: string | null; ownPhoto: boolean; bikeModelId: string | null } | null;
type Mode = "keep" | "catalogue" | "other";

const select = "min-h-12 rounded-lg border border-foreground/40 bg-background px-3";
const OTHER = "__other";
const FIRST_YEAR = 1960;

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()) as T;
}

/** Every model of a make, picture or not: the list is paged, so read pages until the total is reached. */
async function modelsOf(make: string, signal: AbortSignal): Promise<BikeModel[]> {
  const items: BikeModel[] = [];
  for (let page = 1; ; page++) {
    const d = await getJson<BikeModelPage>(`/api/v1/bikes?all=1&make=${encodeURIComponent(make)}${page > 1 ? `&page=${page}` : ""}`, signal);
    items.push(...d.items);
    if (!d.items.length || items.length >= d.total) return items;
  }
}

/** Years to offer, newest first: the model's production years when known, else every year since 1960. */
function yearOptions(model: BikeModel | undefined, saved: number | null): number[] {
  const last = new Date().getFullYear() + 1;
  const from = model?.yearFrom ?? FIRST_YEAR;
  const to = Math.max(from, Math.min(model?.yearTo ?? last, last));
  const years = Array.from({ length: to - from + 1 }, (_, i) => to - i);
  return saved !== null && !years.includes(saved) ? [saved, ...years].sort((a, b) => b - a) : years;
}

/**
 * The picture, make, model and year of the account form, all chosen from lists. The form fields are `name`, `modelYear`
 * and, when the bike changes, `bikeModelId` (the catalogue id, or "none" for a bike that is not in the catalogue).
 */
export function BikeFields({ bike }: { bike: Initial }) {
  const [mode, setMode] = useState<Mode>(bike ? "keep" : "catalogue");
  const [makes, setMakes] = useState<BikeMakeList["items"]>([]);
  const [make, setMake] = useState("");
  const [models, setModels] = useState<{ make: string; items: BikeModel[] } | null>(null);
  const [modelId, setModelId] = useState("");
  const [other, setOther] = useState("");
  const [year, setYear] = useState(bike?.modelYear ? String(bike.modelYear) : "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (mode === "keep" || makes.length) return;
    const ctl = new AbortController();
    getJson<BikeMakeList>("/api/v1/bikes/makes?all=1", ctl.signal).then((d) => setMakes(d.items)).catch(() => { if (!ctl.signal.aborted) setFailed(true); });
    return () => ctl.abort();
  }, [mode, makes.length]);
  useEffect(() => {
    if (!make || make === OTHER) return;
    const ctl = new AbortController();
    modelsOf(make, ctl.signal).then((items) => setModels({ make, items })).catch(() => { if (!ctl.signal.aborted) setFailed(true); });
    return () => ctl.abort();
  }, [make]);

  const items = models?.make === make ? models.items : [];
  const loading = Boolean(make) && make !== OTHER && models?.make !== make;
  const picked = items.find((m) => m.id === modelId);
  const years = yearOptions(picked, bike?.modelYear ?? null);
  const name = mode === "keep" ? bike?.name ?? "" : mode === "other" ? other : picked ? `${picked.make} ${picked.model}`.slice(0, 60) : "";
  const own = bike?.ownPhoto ? bike.photoUrl : null;
  const preset = mode === "keep" ? (bike?.ownPhoto ? null : bike?.photoUrl) : picked?.image;

  function chooseMake(slug: string) {
    setMake(slug);
    setModelId("");
    if (slug === OTHER) setMode("other"); else setMode("catalogue");
  }
  function chooseModel(id: string) {
    setModelId(id);
    const m = items.find((x) => x.id === id);
    const allowed = yearOptions(m, null);
    setYear((y) => (allowed.includes(Number(y)) ? y : ""));
  }
  return (
    <>
      <BikeImage own={own} preset={preset} want={800} alt={name || "Your bike"} className="w-full max-w-sm" />
      <input type="hidden" name="name" value={mode === "other" ? other : name} readOnly />
      {mode === "other" ? <input type="hidden" name="bikeModelId" value="none" /> : modelId ? <input type="hidden" name="bikeModelId" value={modelId} /> : null}
      {mode === "keep" ? (
        <>
          <p className="font-medium">{bike?.name}</p>
          <button type="button" onClick={() => setMode("catalogue")} className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Change bike</button>
        </>
      ) : (
        <>
          <label htmlFor="bike-make" className="text-sm font-medium">Make</label>
          <select id="bike-make" value={make} onChange={(e) => chooseMake(e.target.value)} className={select}>
            <option value="">Choose a make</option>
            {makes.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            <option value={OTHER}>Other (type the name)</option>
          </select>
          {mode === "other" ? (
            <>
              <label htmlFor="bike-name" className="text-sm font-medium">Bike name</label>
              <input id="bike-name" value={other} onChange={(e) => setOther(e.target.value)} minLength={2} maxLength={60} required className={select} />
            </>
          ) : (
            <>
              <label htmlFor="bike-model" className="text-sm font-medium">Model</label>
              <select id="bike-model" value={modelId} onChange={(e) => chooseModel(e.target.value)} disabled={!make || loading} required className={select}>
                <option value="">{loading ? "Loading…" : "Choose a model"}</option>
                {items.map((m) => <option key={m.id} value={m.id}>{m.model}{m.variant ? ` ${m.variant}` : ""}</option>)}
              </select>
            </>
          )}
          {failed ? <p role="alert" className="text-sm font-medium text-status-stop">The bike list could not be loaded. Choose “Other” to type your bike’s name.</p> : null}
        </>
      )}
      <label htmlFor="bike-year" className="text-sm font-medium">Model year <span className="text-muted">(optional)</span></label>
      <select id="bike-year" name="modelYear" value={year} onChange={(e) => setYear(e.target.value)} className={select}>
        <option value="">Not set</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </>
  );
}
