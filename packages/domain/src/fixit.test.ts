import { describe, expect, it } from "vitest";
import { isFixitContent, artIdsOf, fixitCheckStatus, fixitProblems, guideById, guidesForCheck, kitFor, MAX_STEP_WORDS, stepWords, trailsideGuides } from "./fixit";
import { FIXIT_ART_ALT, FIXIT_CHECKS, FIXIT_GUIDES, FIXIT_TOOLS } from "./fixitContent";

const content = { guides: FIXIT_GUIDES, tools: FIXIT_TOOLS, checks: FIXIT_CHECKS };

describe("Fix it content", () => {
  it("has no problems", () => expect(fixitProblems(content)).toEqual([]));
  it("keeps every step short enough to read with gloves on", () => {
    for (const g of FIXIT_GUIDES) for (const s of g.steps) expect(s.text.trim().split(/\s+/).length, `${g.id}: ${s.text}`).toBeLessThanOrEqual(MAX_STEP_WORDS);
  });
  it("does not claim a mechanic checked anything until one has", () => { for (const g of FIXIT_GUIDES) expect(g.review, g.id).toBeNull(); });
  it("tells the rider what to expect on the steps that can be checked", () => {
    const withResult = FIXIT_GUIDES.flatMap((g) => g.steps).filter((s) => s.expect).length;
    expect(withResult).toBeGreaterThanOrEqual(30);
  });
  it("explains the words a first-timer may not know", () => { for (const g of FIXIT_GUIDES) expect(g.terms.length, g.id).toBeGreaterThanOrEqual(2); });
  it("makes the brakes guide checks only", () => {
    const b = guideById(content, "brakes-soft")!;
    expect(b.difficulty).toBe("hard");
    expect(b.steps.some((s) => /do not try to bleed or repair/i.test(s.text))).toBe(true);
  });
  it("keeps the roadside list short, easiest first", () => {
    const list = trailsideGuides(content);
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.length).toBeLessThanOrEqual(8);
    const rank = { easy: 0, moderate: 1, hard: 2 } as const;
    for (let i = 1; i < list.length; i++) expect(rank[list[i]!.difficulty]).toBeGreaterThanOrEqual(rank[list[i - 1]!.difficulty]);
  });
  it("adds the remote tools only for remote rides", () => {
    expect(kitFor(content, false).every((t) => t.kit === "base")).toBe(true);
    expect(kitFor(content, true)).toHaveLength(FIXIT_TOOLS.length);
  });
  it("offers real guides for a check that needs fixing", () => {
    expect(guidesForCheck(content, FIXIT_CHECKS[0]!).length).toBeGreaterThan(0);
  });
  it("names 18 pictures, each with a description", () => {
    const ids = [...new Set(artIdsOf(content))].sort();
    expect(ids).toHaveLength(18);
    expect(Object.keys(FIXIT_ART_ALT).sort()).toEqual(ids);
  });
});

describe("fixitProblems", () => {
  it("catches a step that is too long, a missing stop line and an unknown tool", () => {
    const bad = { tools: FIXIT_TOOLS, checks: [], guides: [{ ...FIXIT_GUIDES[0]!, stopIf: ["one"], tools: ["nope"], steps: [{ text: "word ".repeat(30) }, ...FIXIT_GUIDES[0]!.steps.slice(0, 4)] }] };
    const p = fixitProblems(bad).join("|");
    expect(p).toMatch(/at least two/);
    expect(p).toMatch(/unknown tool nope/);
    expect(p).toMatch(/step 1: 30 words/);
  });
});

describe("stepWords and checkStatus", () => {
  it("counts a step's action, warning and result together", () => expect(stepWords({ text: "one two", warn: "three", expect: "four five" })).toBe(5));
  const noon = new Date("2026-11-04T12:00:00").getTime();
  it("is none, old, clear or flagged", () => {
    expect(fixitCheckStatus(null, noon)).toBe("none");
    expect(fixitCheckStatus({ at: noon - 86_400_000, flagged: [] }, noon)).toBe("old");
    expect(fixitCheckStatus({ at: noon - 3_600_000, flagged: [] }, noon)).toBe("clear");
    expect(fixitCheckStatus({ at: noon - 3_600_000, flagged: ["tyres"] }, noon)).toBe("flagged");
  });
});

describe("isFixitContent", () => {
  const ok = { updatedAt: "x", tools: FIXIT_TOOLS, checks: FIXIT_CHECKS, guides: FIXIT_GUIDES, art: {} };
  it("accepts the real content", () => expect(isFixitContent(ok)).toBe(true));
  it("rejects missing pieces, so a bad edit keeps the phone’s copy", () => {
    expect(isFixitContent(null)).toBe(false);
    expect(isFixitContent({ ...ok, guides: [] })).toBe(false);
    expect(isFixitContent({ ...ok, guides: [{ ...FIXIT_GUIDES[0]!, steps: [] }] })).toBe(false);
    expect(isFixitContent({ ...ok, guides: [{ ...FIXIT_GUIDES[0]!, stopIf: [] }] })).toBe(false);
    expect(isFixitContent({ ...ok, art: undefined })).toBe(false);
  });
});
