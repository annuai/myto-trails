import { slugify } from "./slug";

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

export const INDIA_STATES: { name: string; slug: string; kind: "state" | "ut" }[] = [
  ...STATE_NAMES.map((name) => ({ name, slug: slugify(name), kind: "state" as const })),
  ...UT_NAMES.map((name) => ({ name, slug: slugify(name), kind: "ut" as const })),
];
