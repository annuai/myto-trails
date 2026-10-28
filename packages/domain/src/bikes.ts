import type { BikeImageVariants } from "./api";

export const BIKE_CATEGORIES = ["commuter", "retro", "cruiser", "adventure", "scrambler", "naked", "sport", "touring", "offroad", "scooter", "electric"] as const;
export type BikeCategory = (typeof BIKE_CATEGORIES)[number];

/** Smallest WebP variant at least `width` wide, else the largest one. Variants are { "400": url, ... }; null when there are none. */
export function pickVariant(variants: unknown, width: number): string | null {
  if (typeof variants !== "object" || variants === null) return null;
  const sizes = Object.entries(variants as Record<string, string>).map(([w, url]) => [Number(w), url] as const).filter(([w]) => Number.isFinite(w)).sort((a, b) => a[0] - b[0]);
  if (!sizes.length) return null;
  return (sizes.find(([w]) => w >= width) ?? sizes[sizes.length - 1]!)[1];
}

/**
 * One image per bike, for the server, the app and the website alike: the rider's own photo, else the catalogue image of
 * their model, else null (show the placeholder). Each source is a single URL or a map of widths.
 */
export function resolveBikeImage(own: string | BikeImageVariants | null | undefined, preset: string | BikeImageVariants | null | undefined, width: number): { url: string | null; own: boolean } {
  const pick = (v: string | BikeImageVariants | null | undefined) => (typeof v === "string" ? v || null : pickVariant(v, width));
  const mine = pick(own);
  if (mine) return { url: mine, own: true };
  return { url: pick(preset), own: false };
}
