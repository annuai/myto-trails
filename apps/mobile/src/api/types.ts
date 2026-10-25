import type { LatLng } from '@/lib/geo';

export type Cover = { variants: Record<string, string>; altText: string; width: number; height: number };
export type TrailSummary = {
  id: string; slug: string; name: string; summary: string; nearestTown: string;
  state: { slug: string; name: string }; district: { slug: string; name: string };
  difficulty: string; terrain: string[]; distanceKm: number | null; estDurationMin: number | null;
  accessClass: string; condition: string; verification: { level: string; needsRecheck: boolean }; verifiedAt: string | null;
  isSample: boolean; updatedAt: string; lon: number; lat: number; distanceFromKm: number | null; cover: Cover | null;
};
export type Media = { role: string; position: number; caption: string | null; altText: string; credit: string | null; variants: Record<string, string>; width: number; height: number };
export type TrailDetail = TrailSummary & {
  /** Photos, cover first. Missing on copies saved before the API sent them. */
  media?: Media[];
  description: string | null; safetyNotes: string | null; hazards: string[]; bestMonths: number[]; elevationGainM: number | null;
  restrictions: string[]; permissionInstructions: string | null; conditionNote: string | null; hasGpx: boolean;
};
export type RouteDto = { distanceKm: number; elevGainM: number; elevLossM: number; minElevM: number; maxElevM: number; pointCount: number; profile: { d: number; e: number }[]; line: [number, number][] };
export type SearchResult = { items: TrailSummary[]; total: number; page: number; pageSize: number };
export type SavedItem = { addedAt: string; trail: TrailSummary | null; unavailableId?: string };

/** The API sends [longitude, latitude]; the app uses {lat, lng}. */
export const toLatLng = (line: [number, number][]): LatLng[] => line.map(([lng, lat]) => ({ lat, lng }));

export type Bike = { name: string; modelYear: number | null; photoUrl: string | null };
export type Me = { displayName: string; email: string; avatarUrl: string | null; bike: Bike | null };
export type ClubSummary = {
  clubId: string; name: string; description: string; womenOnly: boolean; memberCount: number;
  role: 'admin' | 'member' | null; requested: boolean; coverUrl: string | null;
};
export type ClubMember = { handle: string; name: string; role: 'admin' | 'member'; avatarUrl: string | null; bike: Bike | null };
export type ClubDetail = { club: ClubSummary; members: ClubMember[] | null };
