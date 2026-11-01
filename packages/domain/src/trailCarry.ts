/** What a rider should carry on a trail, and the best time of day to reach it. Optional trail content, versioned like hazards. */
export const CARRY_ITEMS = [
  "puncture_kit", "tyre_inflator", "tool_kit", "first_aid", "rain_gear", "extra_fuel", "torch",
  "power_bank", "offline_map", "snacks", "cash", "tow_strap", "sun_protection", "warm_layer",
] as const;
export type CarryItem = (typeof CARRY_ITEMS)[number];

export const CARRY_ITEM_LABEL: Record<CarryItem, string> = {
  puncture_kit: "Puncture repair kit",
  tyre_inflator: "Tyre inflator",
  tool_kit: "Tool kit",
  first_aid: "First aid kit",
  rain_gear: "Rain gear",
  extra_fuel: "Extra fuel",
  torch: "Torch",
  power_bank: "Power bank",
  offline_map: "Offline map",
  snacks: "Snacks",
  cash: "Cash",
  tow_strap: "Tow strap",
  sun_protection: "Sun protection",
  warm_layer: "Warm layer",
};

/** Minutes after midnight (0 to 1439) as "6:00 AM". */
function clock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "6:00 AM to 8:00 AM" for a window given in minutes after midnight. */
export const arrivalText = (from: number, to: number): string => `${clock(from)} to ${clock(to)}`;

/** An `<input type="time">` value ("06:00") as minutes after midnight, or null when it is not a time of day. */
export function hhmmToMinutes(s: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Minutes after midnight as an `<input type="time">` value. */
export const minutesToHhmm = (min: number): string => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** How many riders must mark a trail before it reads as "Safe for women riders" instead of "Reported safe by N". */
export const WOMEN_SAFE_CONFIRMED_AT = 3;
