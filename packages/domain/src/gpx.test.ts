import { describe, expect, it } from "vitest";
import { canDownloadGpx } from "./gpx";

const ok = { lifecycle: "published", accessClass: "public", sensitivity: "standard", hasGpx: true, condition: "open" } as const;

describe("canDownloadGpx", () => {
  it("allows a published, standard, public, open trail with a GPX", () => {
    expect(canDownloadGpx(ok)).toEqual({ allowed: true });
  });
  it("allows permission-required access and seasonal or unknown condition", () => {
    expect(canDownloadGpx({ ...ok, accessClass: "permission_required", condition: "seasonal" })).toEqual({ allowed: true });
    expect(canDownloadGpx({ ...ok, condition: "unknown" })).toEqual({ allowed: true });
  });
  it.each([
    [{ lifecycle: "draft" }, "not_published"],
    [{ lifecycle: "unpublished" }, "not_published"],
    [{ hasGpx: false }, "no_gpx"],
    [{ sensitivity: "sensitive" }, "sensitive_area"],
    [{ sensitivity: "restricted_geometry" }, "sensitive_area"],
    [{ accessClass: "restricted" }, "access_not_allowed"],
    [{ accessClass: "private_no_access" }, "access_not_allowed"],
    [{ accessClass: "unknown" }, "access_not_allowed"],
    [{ condition: "permanently_closed" }, "permanently_closed"],
  ] as const)("refuses %j with %s", (override, reason) => {
    expect(canDownloadGpx({ ...ok, ...override })).toEqual({ allowed: false, reason });
  });
});
