import { describe, expect, it } from "vitest";
import {
  ACCESS_BASES, ACCESS_CLASSES, CONDITION_REASONS, DIFFICULTIES, EVIDENCE_KINDS, HAZARDS, LIFECYCLES,
  OPERATIONAL_STATUSES, RESTRICTIONS, ROUTE_SHAPES, SENSITIVITIES, SUITABILITIES, TERRAINS, VERIFICATION_LEVELS,
} from "./enums";

describe("domain enums", () => {
  it("lists access classes", () => {
    expect(ACCESS_CLASSES).toEqual(["public", "permission_required", "private_no_access", "restricted", "unknown"]);
  });
  it("lists operational statuses", () => {
    expect(OPERATIONAL_STATUSES).toEqual(["open", "temporarily_closed", "permanently_closed", "seasonal", "unknown"]);
  });
  it("lists verification levels", () => {
    expect(VERIFICATION_LEVELS).toEqual(["officially_verified", "moderator_verified", "community_reported", "unverified"]);
  });
  it("lists trail content vocabularies", () => {
    expect(DIFFICULTIES).toEqual(["easy", "moderate", "hard", "expert"]);
    expect(TERRAINS).toEqual(["dirt", "gravel", "mud", "sand", "rock", "forest_track", "mountain_road", "riverbed", "mixed"]);
    expect(SUITABILITIES).toEqual(["adventure_tourer", "dual_sport", "enduro", "scrambler", "small_displacement", "any"]);
    expect(ROUTE_SHAPES).toEqual(["loop", "out_and_back", "point_to_point"]);
    expect(SENSITIVITIES).toEqual(["standard", "sensitive", "restricted_geometry"]);
    expect(LIFECYCLES).toEqual(["draft", "in_review", "published", "unpublished", "archived"]);
  });
  it("lists access and condition vocabularies", () => {
    expect(CONDITION_REASONS).toEqual(["weather", "landslide", "construction", "private_closure", "regulatory", "unknown", "other"]);
    expect(HAZARDS).toEqual(["slippery_after_rain", "river_crossing", "steep_descent", "loose_rock", "wildlife", "no_mobile_signal", "no_fuel", "low_branches"]);
    expect(ACCESS_BASES).toEqual(["official_notice", "owner_confirmed", "authority_confirmed", "rider_observed", "map_data", "none"]);
    expect(EVIDENCE_KINDS).toEqual(["official_document", "written_confirmation", "signage_photo", "url", "call_note", "other"]);
    expect(RESTRICTIONS).toEqual(["forest_dept", "protected_area", "private_estate", "seasonal_ban", "permit", "no_motor_vehicles"]);
  });
});
