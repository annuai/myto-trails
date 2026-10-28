// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DELETE_CONFIRMATION, isDeleteConfirmed, publicVariantKeys } from "./delete";

describe("publicVariantKeys", () => {
  it("lists the public file for every width and format the upload was converted to", () => {
    const keys = publicVariantKeys("abc", { "480": "https://cdn/x-480.webp", "960": "https://cdn/x-960.webp" }, { "480": "https://cdn/x-480.avif" });
    expect(keys.sort()).toEqual(["image/abc-480.avif", "image/abc-480.webp", "image/abc-960.webp"]);
  });

  it("is empty when nothing was converted, and ignores widths that are not plain numbers", () => {
    expect(publicVariantKeys("abc", {}, {})).toEqual([]);
    expect(publicVariantKeys("abc", { "../../x": "u", "480": "u" }, {})).toEqual(["image/abc-480.webp"]);
  });
});

describe("isDeleteConfirmed", () => {
  it("needs the typed word, ignoring case and surrounding spaces, and nothing else", () => {
    expect(DELETE_CONFIRMATION).toBe("delete");
    expect(isDeleteConfirmed("delete")).toBe(true);
    expect(isDeleteConfirmed("  Delete ")).toBe(true);
    for (const bad of ["", "del", "delete my account", "deleted", undefined, null, 5]) expect(isDeleteConfirmed(bad)).toBe(false);
  });
});
