// The words shown for trail data, made from the stored values.

import type { ConditionReason, Difficulty, Hazard, Restriction, RouteShape, Suitability, Terrain } from "@moto-trails/domain";

const sentence = (value: string) => {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** A terrain as a sentence-case label. */
export const terrainLabel = (t: Terrain | string) => sentence(t);
/** A difficulty as a label. */
export const difficultyLabel = (d: Difficulty) => sentence(d);
/** A bike suitability as a label. */
export const suitabilityLabel = (s: Suitability | string) => sentence(s);
/** A suggested bike type as a label. */
export const suggestionLabel = (s: Suitability | string) => sentence(s);
/** A hazard as a label. */
export const hazardLabel = (h: Hazard | string) => sentence(h);
/** A route shape as a label. */
export const routeShapeLabel = (r: RouteShape) => sentence(r);
/** The reason for a condition as a label. */
export const conditionReasonLabel = (r: ConditionReason | string) => sentence(r);

const RESTRICTIONS: Record<Restriction, string> = {
  forest_dept: "Forest department",
  protected_area: "Protected area",
  private_estate: "Private estate",
  seasonal_ban: "Seasonal ban",
  permit: "Permit",
  no_motor_vehicles: "No motor vehicles",
  local_ordinance: "Local ordinance",
  public_land_closure: "Public land closure",
};
/** A restriction as a label, in its own wording where it has one. */
export const restrictionLabel = (r: Restriction | string) => RESTRICTIONS[r as Restriction] ?? sentence(r);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** A month number (1 to 12) as a short name. */
export const monthLabel = (month: number) => MONTHS[month - 1] ?? "";

/** Minutes as `45 min` or hours and minutes. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** A distance as kilometres with at most one decimal. */
export function formatKm(km: number): string {
  return `${Number(km.toFixed(1))} km`;
}
