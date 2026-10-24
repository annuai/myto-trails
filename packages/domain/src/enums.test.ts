import { describe, expect, it } from "vitest";
import { ACCESS_CLASSES, OPERATIONAL_STATUSES, VERIFICATION_LEVELS } from "./enums";

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
});
