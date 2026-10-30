export const ACCESS_CLASSES = ["public", "permission_required", "private_no_access", "restricted", "unknown"] as const;
export const OPERATIONAL_STATUSES = ["open", "temporarily_closed", "permanently_closed", "seasonal", "unknown"] as const;
export const VERIFICATION_LEVELS = ["officially_verified", "moderator_verified", "community_reported", "unverified"] as const;

export type AccessClass = (typeof ACCESS_CLASSES)[number];
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export const DIFFICULTIES = ["easy", "moderate", "hard", "expert"] as const;
export const TERRAINS = ["dirt", "gravel", "mud", "sand", "rock", "forest_track", "mountain_road", "riverbed", "mixed"] as const;
export const SUITABILITIES = ["adventure_tourer", "dual_sport", "enduro", "scrambler", "small_displacement", "any"] as const;
export const ROUTE_SHAPES = ["loop", "out_and_back", "point_to_point"] as const;
export const SENSITIVITIES = ["standard", "sensitive", "restricted_geometry"] as const;
export const LIFECYCLES = ["draft", "in_review", "published", "unpublished", "archived"] as const;
export const CONDITION_REASONS = ["weather", "landslide", "construction", "private_closure", "regulatory", "unknown", "other"] as const;
export const HAZARDS = [
  "slippery_after_rain",
  "river_crossing",
  "steep_descent",
  "loose_rock",
  "wildlife",
  "no_mobile_signal",
  "no_fuel",
  "low_branches",
] as const;
export const ACCESS_BASES = ["official_notice", "owner_confirmed", "authority_confirmed", "rider_observed", "map_data", "none"] as const;
export const EVIDENCE_KINDS = ["official_document", "written_confirmation", "signage_photo", "url", "call_note", "other"] as const;
export const RESTRICTIONS = ["forest_dept", "protected_area", "private_estate", "seasonal_ban", "permit", "no_motor_vehicles", "local_ordinance", "public_land_closure"] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];
export type Terrain = (typeof TERRAINS)[number];
export type Suitability = (typeof SUITABILITIES)[number];
export type RouteShape = (typeof ROUTE_SHAPES)[number];
export type Sensitivity = (typeof SENSITIVITIES)[number];
export type Lifecycle = (typeof LIFECYCLES)[number];
export type ConditionReason = (typeof CONDITION_REASONS)[number];
export type Hazard = (typeof HAZARDS)[number];
export type AccessBasis = (typeof ACCESS_BASES)[number];
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type Restriction = (typeof RESTRICTIONS)[number];
