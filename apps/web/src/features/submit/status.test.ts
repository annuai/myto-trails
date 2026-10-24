import { describe, expect, it } from "vitest";
import { statusLabel } from "./status";

describe("statusLabel", () => {
  it("uses plain words for every status", () => {
    expect(statusLabel("submitted")).toBe("In review");
    expect(statusLabel("changes_requested")).toBe("Changes requested");
    expect(statusLabel("approved")).toBe("Published");
    expect(statusLabel("mystery")).toBe("mystery");
  });
});
