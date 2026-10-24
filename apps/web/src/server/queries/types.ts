import type {
  AccessClass, Difficulty, OperationalStatus, RouteShape, Sensitivity, VerificationLevel,
} from "@moto-trails/domain";

export type PlaceDto = { slug: string; name: string };

export type TrailSummaryDto = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  nearestTown: string;
  state: PlaceDto;
  district: PlaceDto | null;
  difficulty: Difficulty;
  terrain: string[];
  distanceKm: number | null;
  estDurationMin: number | null;
  accessClass: AccessClass;
  /** Effective condition: an overdue temporary closure is reported as unknown. Recompute with applyNow(). */
  condition: OperationalStatus;
  /** Stored condition, kept so the effective one can be recomputed after caching. */
  rawCondition: OperationalStatus;
  conditionExpectedUntil: string | null;
  /** Effective verification: expired verification asks for a re-check, then downgrades to unverified. */
  verification: { level: VerificationLevel; needsRecheck: boolean };
  /** Stored verification level, kept so the effective one can be recomputed after caching. */
  rawVerificationLevel: VerificationLevel;
  verifiedAt: string | null;
  validUntil: string | null;
  isSample: boolean;
  updatedAt: string;
};

export type TrailDetailDto = TrailSummaryDto & {
  description: string | null;
  suitableFor: string[];
  bestMonths: number[];
  seasonNotes: string | null;
  hazards: string[];
  safetyNotes: string | null;
  surfaceNotes: string | null;
  routeShape: RouteShape | null;
  elevationGainM: number | null;
  version: number;
  contributorCredit: string | null;
  restrictions: string[];
  permissionInstructions: string | null;
  evidenceCount: number;
  evidenceKinds: string[];
  conditionReason: string | null;
  conditionNote: string | null;
  sensitivity: Sensitivity;
  /** Public location only: the exact start is never exposed for sensitive trails. */
  location: { lon: number; lat: number } | null;
  firstPublishedAt: string | null;
  /** Recent closure reports that moderators have not resolved yet (no reporter details). */
  openClosureReports: number;
};

export type RegionDto = {
  kind: "country" | "state" | "district";
  name: string;
  slug: string;
  parentSlug: string | null;
  publishedTrailCount: number;
};

export type MediaDto = {
  role: "cover" | "gallery";
  position: number;
  caption: string | null;
  altText: string;
  credit: string | null;
  variants: Record<string, string>;
  width: number | null;
  height: number | null;
};
