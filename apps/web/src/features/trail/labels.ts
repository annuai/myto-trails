import type { ConditionReason, Difficulty, Hazard, Restriction, RouteShape, Suitability, Terrain } from "@moto-trails/domain";

const sentence = (value: string) => {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const terrainLabel = (t: Terrain | string) => sentence(t);
export const difficultyLabel = (d: Difficulty) => sentence(d);
export const suitabilityLabel = (s: Suitability | string) => sentence(s);
export const suggestionLabel = (s: Suitability | string) => sentence(s);
export const hazardLabel = (h: Hazard | string) => sentence(h);
export const routeShapeLabel = (r: RouteShape) => sentence(r);
export const conditionReasonLabel = (r: ConditionReason | string) => sentence(r);

const RESTRICTIONS: Record<Restriction, string> = {
  forest_dept: "Forest department",
  protected_area: "Protected area",
  private_estate: "Private estate",
  seasonal_ban: "Seasonal ban",
  permit: "Permit",
  no_motor_vehicles: "No motor vehicles",
};
export const restrictionLabel = (r: Restriction | string) => RESTRICTIONS[r as Restriction] ?? sentence(r);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (month: number) => MONTHS[month - 1] ?? "";

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatKm(km: number): string {
  return `${Number(km.toFixed(1))} km`;
}
