import { describe, expect, it } from "vitest";
import { parseStepForm } from "./parse-form";

const fd = (entries: [string, string][]) => {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
};

describe("parseStepForm", () => {
  it("reads basics as plain strings", () => {
    expect(parseStepForm(1, fd([["name", "A"], ["summary", "B"], ["state", "kerala"], ["district", "Wayanad"], ["nearestTown", "Kalpetta"]]))).toEqual({
      name: "A", summary: "B", state: "kerala", district: "Wayanad", nearestTown: "Kalpetta",
    });
  });

  it("reads the start point as numbers, leaving blanks and junk undefined so validation reports them", () => {
    expect(parseStepForm(2, fd([["lat", "11.6"], ["lon", "76.1"], ["routeShape", "loop"]]))).toEqual({ startPoint: { lat: 11.6, lon: 76.1 }, routeShape: "loop" });
    expect(parseStepForm(2, fd([["lat", ""], ["lon", "abc"], ["routeShape", "loop"]]))).toEqual({ startPoint: undefined, routeShape: "loop" });
    expect((parseStepForm(2, fd([["lat", "Infinity"], ["lon", "76"]])) as Record<string, unknown>).startPoint).toBeUndefined();
  });

  it("collects repeated checkbox values and months as numbers", () => {
    const r = parseStepForm(3, fd([["difficulty", "hard"], ["terrain", "gravel"], ["terrain", "mud"], ["bestMonths", "11"], ["bestMonths", "12"], ["hazards", "wildlife"]]));
    expect(r).toMatchObject({ difficulty: "hard", terrain: ["gravel", "mud"], bestMonths: [11, 12], hazards: ["wildlife"], suitableFor: [] });
  });

  it("reads access with evidence rows and skips empty rows", () => {
    const r = parseStepForm(4, fd([
      ["accessClass", "public"], ["basis", "rider_observed"], ["restrictions", "permit"],
      ["evidenceKind_0", "url"], ["evidenceDescription_0", "Forest dept notice"], ["evidenceUrl_0", "https://example.com/n"],
      ["evidenceKind_1", "other"], ["evidenceDescription_1", ""], ["evidenceUrl_1", ""],
      ["evidenceKind_2", "other"], ["evidenceDescription_2", "I rode it"], ["evidenceUrl_2", ""],
    ]));
    expect(r).toMatchObject({ accessClass: "public", basis: "rider_observed", restrictions: ["permit"] });
    expect((r as Record<string, unknown>).evidence).toEqual([
      { kind: "url", description: "Forest dept notice", url: "https://example.com/n" },
      { kind: "other", description: "I rode it", url: "" },
    ]);
  });

  it("reads photo rows by index", () => {
    const r = parseStepForm(5, fd([["photoId_0", "a"], ["photoAlt_0", "Alt A"], ["photoCaption_0", "Cap"], ["photoCredit_0", ""], ["photoId_1", "b"], ["photoAlt_1", ""]]));
    expect(r).toEqual([
      { mediaId: "a", altText: "Alt A", caption: "Cap", credit: "" },
      { mediaId: "b", altText: "", caption: "", credit: "" },
    ]);
  });

  it("reads the review step, treating only an ticked checkbox as accepted", () => {
    expect(parseStepForm(6, fd([["safetyNotes", "s"], ["contributorNote", ""], ["licenceAccepted", "on"]]))).toMatchObject({ licenceAccepted: true });
    expect(parseStepForm(6, fd([["safetyNotes", "s"]]))).toMatchObject({ licenceAccepted: false });
  });

  it("ignores unknown fields and survives a huge number of rows", () => {
    const entries: [string, string][] = Array.from({ length: 500 }, (_, i) => [`photoId_${i}`, String(i)]);
    expect((parseStepForm(5, fd(entries)) as unknown[]).length).toBeLessThanOrEqual(20);
    expect(parseStepForm(1, fd([["isAdmin", "1"]]))).toEqual({ name: "", summary: "", state: "", district: "", nearestTown: "" });
  });
});
