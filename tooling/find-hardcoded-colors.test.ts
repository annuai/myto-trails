import { describe, expect, it } from "vitest";
import { findHardcodedColors } from "./find-hardcoded-colors";

describe("findHardcodedColors", () => {
  it("finds 3, 6 and 8 digit hex literals", () => {
    expect(findHardcodedColors('a{color:#fff;background:#1a1a1a;border:#00000014}')).toEqual(["#fff", "#1a1a1a", "#00000014"]);
  });
  it("ignores anchors and HTML entities", () => {
    expect(findHardcodedColors('<a href="#section">x</a> &#39; &#x27;')).toEqual([]);
  });
  it("returns nothing for token-based classes", () => {
    expect(findHardcodedColors('<div className="bg-surface text-muted" />')).toEqual([]);
  });
});
