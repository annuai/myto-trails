// Regions (states and districts) and when a region page is worth showing.

import { slugify } from "./slug";

/** A region page is indexed by search engines only once it has at least three published trails; before that it would be thin content. */
export function isRegionIndexable(publishedTrailCount: number): boolean {
  return publishedTrailCount >= 3;
}

const STATE_NAMES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const UT_NAMES = [
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

/** The states and union territories, with the slug used in their page address. */
export const INDIA_STATES: { name: string; slug: string; kind: "state" | "ut" }[] = [
  ...STATE_NAMES.map((name) => ({ name, slug: slugify(name), kind: "state" as const })),
  ...UT_NAMES.map((name) => ({ name, slug: slugify(name), kind: "ut" as const })),
];
