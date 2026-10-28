"use client";

import { useEffect, useState } from "react";
import { BIKE_CATEGORIES, type BikeMakeList, type BikeModel, type BikeModelPage } from "@moto-trails/domain";
import { BikeImage } from "./BikeImage";

const SEARCH_DELAY_MS = 300;
const chip = (on: boolean) => `min-h-11 shrink-0 rounded-full px-4 text-sm font-medium ${on ? "bg-foreground text-background" : "bg-card-cream"}`;
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Search box, make chips, type chips and a grid of bike cards, read from the public catalogue API. Only models that have a picture are listed. */
export function BikePicker({ onPick }: { onPick: (model: BikeModel) => void }) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [make, setMake] = useState("");
  const [category, setCategory] = useState("");
  const [makes, setMakes] = useState<BikeMakeList["items"]>([]);
  const [page, setPage] = useState(1);
  // What the last request brought, tagged with the filters and page it answered, so a stale answer reads as "loading".
  const [got, setGot] = useState<{ filter: string; page: number; items: BikeModel[]; total: number; failed: boolean } | null>(null);
  const filter = `${q.trim()}|${make}|${category}`;

  useEffect(() => {
    const t = setTimeout(() => { setQ(text); setPage(1); }, SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/v1/bikes/makes", { signal: ctl.signal }).then((r) => (r.ok ? (r.json() as Promise<BikeMakeList>) : null)).then((d) => d && setMakes(d.items)).catch(() => {});
    return () => ctl.abort();
  }, []);
  useEffect(() => {
    const ctl = new AbortController();
    const params = new URLSearchParams({ ...(q.trim() ? { q: q.trim() } : {}), ...(make ? { make } : {}), ...(category ? { category } : {}), ...(page > 1 ? { page: String(page) } : {}) });
    fetch(`/api/v1/bikes?${params}`, { signal: ctl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<BikeModelPage>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => setGot((prev) => ({ filter, page, items: page > 1 && prev?.filter === filter ? [...prev.items, ...d.items] : d.items, total: d.total, failed: false })))
      .catch(() => { if (!ctl.signal.aborted) setGot({ filter, page, items: [], total: 0, failed: true }); });
    return () => ctl.abort();
  }, [q, make, category, page, filter]);
  const current = got?.filter === filter && got.page === page ? got : null;
  const ready = Boolean(current && !current.failed);
  const items = got?.filter === filter ? got.items : [];
  const total = got?.filter === filter ? got.total : 0;

  const refine = (set: (v: string) => void) => (v: string) => { set(v); setPage(1); };
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="bike-search" className="text-sm font-medium">Search bikes</label>
      <input id="bike-search" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Classic 350, Duke, Activa…" className="min-h-12 rounded-lg border border-foreground/40 bg-background px-3" />
      <div role="group" aria-label="Make" className="flex gap-2 overflow-x-auto">
        <button type="button" aria-pressed={!make} onClick={() => refine(setMake)("")} className={chip(!make)}>All makes</button>
        {makes.map((m) => <button key={m.slug} type="button" aria-pressed={make === m.slug} onClick={() => refine(setMake)(m.slug)} className={chip(make === m.slug)}>{m.name}</button>)}
      </div>
      <div role="group" aria-label="Type" className="flex gap-2 overflow-x-auto">
        <button type="button" aria-pressed={!category} onClick={() => refine(setCategory)("")} className={chip(!category)}>Any type</button>
        {BIKE_CATEGORIES.map((k) => <button key={k} type="button" aria-pressed={category === k} onClick={() => refine(setCategory)(k)} className={chip(category === k)}>{label(k)}</button>)}
      </div>
      {current?.failed ? <p role="alert" className="text-sm font-medium text-status-stop">The bike list could not be loaded. You can still type your bike’s name.</p> : null}
      {ready && !items.length ? <p role="status" className="text-sm text-muted">No bikes match. Try another name, make or type; you can still type your bike’s name yourself.</p> : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onPick(m)} className="flex w-full flex-col gap-2 rounded-2xl bg-card-cream p-2 text-left">
              <BikeImage preset={m.image} want={400} alt={`${m.make} ${m.model}`} />
              <span className="px-1 pb-1"><span className="block text-sm text-muted">{m.make}</span><span className="block text-sm font-medium">{m.model}</span></span>
            </button>
          </li>
        ))}
      </ul>
      {ready && items.length < total ? <button type="button" onClick={() => setPage(page + 1)} className="min-h-12 self-start rounded-lg border border-foreground px-5 text-sm font-medium">Show more</button> : null}
    </div>
  );
}
