"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Suggestions = {
  trails: { slug: string; name: string; place: string }[];
  places: { slug: string; name: string; state: string }[];
  regions: { slug: string; name: string }[];
};
type Option = { id: string; group: "Places" | "Trails" | "Regions"; label: string; detail?: string; href: string };

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

function toOptions(s: Suggestions, base: string): Option[] {
  return [
    ...s.places.map((p, i) => ({ id: `${base}-p${i}`, group: "Places" as const, label: p.name, detail: p.state, href: `/trails?near=${p.slug}` })),
    ...s.trails.map((t, i) => ({ id: `${base}-t${i}`, group: "Trails" as const, label: t.name, detail: t.place, href: `/trails/${t.slug}` })),
    ...s.regions.map((r, i) => ({ id: `${base}-r${i}`, group: "Regions" as const, label: r.name, href: `/regions/${r.slug}` })),
  ];
}

/** Search for a trail, a place (Bangalore, Bengaluru) or a region, using the ARIA combobox pattern. */
export function SearchCombobox({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const base = useId();
  const [text, setText] = useState(initialQuery);
  // Follow the URL: when the server renders a different query (a filter chip was removed, a link followed), show it.
  const [seenInitial, setSeenInitial] = useState(initialQuery);
  if (initialQuery !== seenInitial) {
    setSeenInitial(initialQuery);
    setText(initialQuery);
  }
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    controller.current?.abort();
    const q = text.trim();
    if (q.length < MIN_CHARS) return;
    const timer = setTimeout(async () => {
      const ctl = new AbortController();
      controller.current = ctl;
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        if (!res.ok) throw new Error("suggest failed");
        const next = toOptions((await res.json()) as Suggestions, base);
        setOptions(next);
        setOpen(next.length > 0);
        setActive(-1);
      } catch {
        if (!ctl.signal.aborted) {
          setOptions([]);
          setOpen(false);
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, base]);

  function searchText() {
    const q = text.trim();
    if (q) router.push(`/trails?${new URLSearchParams({ q }).toString()}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp" && options.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = visible ? options[active] : undefined;
      if (chosen) router.push(chosen.href);
      else searchText();
    }
  }

  const visible = open && text.trim().length >= MIN_CHARS;
  const groups = (["Places", "Trails", "Regions"] as const).map((g) => ({ name: g, items: options.filter((o) => o.group === g) })).filter((g) => g.items.length);
  const listId = `${base}-list`;

  return (
    <div className="relative">
      <label htmlFor={`${base}-input`} className="sr-only">Search a place, region or trail name</label>
      <div className="flex gap-2">
        <input
          id={`${base}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls={listId}
          aria-activedescendant={visible && active >= 0 ? options[active]?.id : undefined}
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search a place, region or trail name"
          className="min-h-12 w-full rounded-sm border border-foreground/40 bg-background px-3"
        />
        <button type="button" onClick={searchText} className="min-h-12 rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">
          Search
        </button>
      </div>
      <div id={listId} role="listbox" aria-label="Suggestions" hidden={!visible} className="absolute left-0 right-0 z-10 mt-1 max-h-96 overflow-auto border border-border bg-surface shadow-[0_4px_16px_#0000001f]">
        {groups.map((g) => (
          <div key={g.name} role="group" aria-label={g.name}>
            <p className="px-3 pt-3 text-xs text-muted" aria-hidden="true">{g.name}</p>
            {g.items.map((o) => {
              const index = options.indexOf(o);
              return (
                <div
                  key={o.id}
                  id={o.id}
                  role="option"
                  aria-selected={index === active}
                  onClick={() => router.push(o.href)}
                  onMouseEnter={() => setActive(index)}
                  className={`flex min-h-11 cursor-pointer items-baseline gap-2 px-3 py-2 ${index === active ? "bg-accent-subtle" : ""}`}
                >
                  <span>{o.label}</span>
                  {o.detail ? <span className="text-sm text-muted">{o.detail}</span> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
