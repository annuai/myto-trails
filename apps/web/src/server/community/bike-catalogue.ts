import { BIKE_CATEGORIES, isValidSlug, slugify, type BikeCategory } from "@moto-trails/domain";

/** The WebP widths stored in R2 as bike/<slug>-<width>.webp. */
export const BIKE_IMAGE_WIDTHS = [400, 800, 1200] as const;

export type CatalogueRow = { slug: string; make: string; model: string; category: BikeCategory; engineCc: number | null; yearFrom: number | null; yearTo: number | null };

export const isBikeCategory = (v: unknown): v is BikeCategory => typeof v === "string" && (BIKE_CATEGORIES as readonly string[]).includes(v);

/** The slug is the stable key and the image file name, so it must be a lowercase kebab slug. */
export const isBikeSlug = isValidSlug;

/** Slug of a make name: "Harley-Davidson" -> "harley-davidson", "Moto Morini" -> "moto-morini". */
export const makeSlug = slugify;

/** Splits CSV text into rows of fields. Handles quoted fields, doubled quotes, CRLF and a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

const COLUMNS = ["slug", "make", "model", "category", "engine_cc", "year_from", "year_to"] as const;

function optionalInt(v: string, label: string, min: number, max: number, line: number): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`line ${line}: ${label} "${v}" is not a whole number from ${min} to ${max}`);
  return n;
}

/** Validates the catalogue CSV (columns: slug, make, model, category, engine_cc, year_from, year_to). Throws on the first bad line. */
export function parseCatalogue(text: string): CatalogueRow[] {
  const [head, ...body] = parseCsv(text);
  if (!head || COLUMNS.some((c, i) => head[i]?.trim() !== c)) throw new Error(`the header must be: ${COLUMNS.join(",")}`);
  const seen = new Set<string>();
  return body.map((f, i) => {
    const line = i + 2;
    if (f.length !== COLUMNS.length) throw new Error(`line ${line}: expected ${COLUMNS.length} columns, found ${f.length}`);
    const [slug, make, model, category] = f.map((v) => v.trim()) as [string, string, string, string];
    if (!isBikeSlug(slug)) throw new Error(`line ${line}: "${slug}" is not a valid slug (lowercase letters, digits, hyphens)`);
    if (seen.has(slug)) throw new Error(`line ${line}: duplicate slug "${slug}"`);
    seen.add(slug);
    if (!make || !makeSlug(make)) throw new Error(`line ${line}: make is missing`);
    if (!model) throw new Error(`line ${line}: model is missing`);
    if (!isBikeCategory(category)) throw new Error(`line ${line}: category "${category}" is not one of ${BIKE_CATEGORIES.join(", ")}`);
    const yearFrom = optionalInt(f[5]!, "year_from", 1900, 2100, line);
    const yearTo = optionalInt(f[6]!, "year_to", 1900, 2100, line);
    if (yearFrom !== null && yearTo !== null && yearTo < yearFrom) throw new Error(`line ${line}: year_to is before year_from`);
    return { slug, make, model, category, engineCc: optionalInt(f[4]!, "engine_cc", 1, 5000, line), yearFrom, yearTo };
  });
}

/**
 * Which model a file in the upload folder is for: "<slug>.png" -> slug, or null for anything that is not an image named
 * after a valid slug (such as ".DS_Store" or "Notes.txt").
 */
export function slugOfImageFile(name: string): string | null {
  const m = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(png|webp|jpe?g|avif)$/.exec(name);
  return m && isBikeSlug(m[1]!) ? m[1]! : null;
}

/** Widths to produce for a source image: never enlarges, but always yields at least the source width. */
export function variantWidths(sourceWidth: number): number[] {
  const widths = BIKE_IMAGE_WIDTHS.filter((w) => w <= sourceWidth);
  return widths.length ? [...widths] : [sourceWidth];
}

/** The R2 object key (in the public bucket) of one width of a model's image. */
export const bikeImageKey = (slug: string, width: number) => `bike/${slug}-${width}.webp`;
