import type { LatLng } from '@/lib/geo';

export type Cover = { variants: Record<string, string>; altText: string; width: number; height: number };
export type TrailSummary = {
  id: string; slug: string; name: string; summary: string; nearestTown: string;
  state: { slug: string; name: string }; district: { slug: string; name: string };
  difficulty: string; terrain: string[]; distanceKm: number | null; estDurationMin: number | null;
  accessClass: string; condition: string; verification: { level: string; needsRecheck: boolean }; verifiedAt: string | null;
  isSample: boolean; updatedAt: string; lon: number; lat: number; distanceFromKm: number | null; cover: Cover | null;
};
export type TrailDetail = TrailSummary & {
  description: string | null; safetyNotes: string | null; hazards: string[]; bestMonths: number[]; elevationGainM: number | null;
  restrictions: string[]; permissionInstructions: string | null; conditionNote: string | null; hasGpx: boolean;
};
export type RouteDto = { distanceKm: number; elevGainM: number; elevLossM: number; minElevM: number; maxElevM: number; pointCount: number; profile: { d: number; e: number }[]; line: [number, number][] };
export type SearchResult = { items: TrailSummary[]; total: number; page: number; pageSize: number };
export type SavedItem = { addedAt: string; trail: TrailSummary | null; unavailableId?: string };

/** The API sends [longitude, latitude]; the app uses {lat, lng}. */
export const toLatLng = (line: [number, number][]): LatLng[] => line.map(([lng, lat]) => ({ lat, lng }));
