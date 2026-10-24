import { describe, expect, it } from "vitest";
import { GPX_MAX_BYTES, IMAGE_MAX_BYTES, IMAGE_MAX_MEGAPIXELS } from "./limits";

describe("upload limits", () => {
  it("caps GPX files at 5 MB", () => {
    expect(GPX_MAX_BYTES).toBe(5242880);
  });
  it("caps images at 10 MB and 40 megapixels", () => {
    expect(IMAGE_MAX_BYTES).toBe(10485760);
    expect(IMAGE_MAX_MEGAPIXELS).toBe(40);
  });
});
