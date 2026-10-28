"use client";

import { useState } from "react";
import type { BikeImageVariants, BikeModel } from "@moto-trails/domain";
import { BikeImage } from "./BikeImage";
import { BikePicker } from "./BikePicker";

type Initial = { name: string; modelYear: number | null; photoUrl: string | null; ownPhoto: boolean; bikeModelId: string | null } | null;

/** The picture, "Choose a bike", name and year of the account form. The chosen model travels as the hidden field `bikeModelId`. */
export function BikeFields({ bike }: { bike: Initial }) {
  const [name, setName] = useState(bike?.name ?? "");
  const [open, setOpen] = useState(false);
  // undefined keeps the saved model (no field is sent), "" removes it, an id replaces it.
  const [model, setModel] = useState<{ id: string; image: BikeImageVariants | null } | null>(null);
  const own = bike?.ownPhoto ? bike.photoUrl : null;
  const preset = model ? model.image : bike?.ownPhoto ? null : bike?.photoUrl;

  function pick(m: BikeModel) {
    setModel({ id: m.id, image: m.image });
    setName(`${m.make} ${m.model}`.slice(0, 60));
    setOpen(false);
  }
  return (
    <>
      <BikeImage own={own} preset={preset} want={800} alt={name || "Your bike"} className="w-full max-w-sm" />
      {model ? <input type="hidden" name="bikeModelId" value={model.id} /> : null}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-12 self-start rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover">Choose a bike</button>
      {open ? <BikePicker onPick={pick} /> : null}
      <label htmlFor="bike-name" className="text-sm font-medium">Bike name</label>
      <input id="bike-name" name="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} required className="min-h-12 rounded-lg border border-foreground/40 bg-background px-3" />
      <label htmlFor="bike-year" className="text-sm font-medium">Model year <span className="text-muted">(optional)</span></label>
      <input id="bike-year" name="modelYear" type="number" inputMode="numeric" min={1900} max={2100} defaultValue={bike?.modelYear ?? ""} className="min-h-12 rounded-lg border border-foreground/40 bg-background px-3" />
    </>
  );
}
