import { describe, expect, it } from "vitest";
import { MAX_PHOTOS, STEP_FIELDS, validateAll, validateStep } from "./schema";

const basics = { name: "Ridge track above the lake", summary: "A gravel ridge track with long views over the lake, suitable for dual sport bikes in dry weather.", state: "kerala", district: "Wayanad", nearestTown: "Kalpetta" };
const route = { startPoint: { lat: 11.6, lon: 76.1 }, routeShape: "loop" };
const details = { difficulty: "moderate", terrain: ["gravel"], suitableFor: ["dual_sport"], bestMonths: [11, 12], hazards: ["river_crossing"], seasonNotes: "", surfaceNotes: "", description: "" };
const access = { accessClass: "public", restrictions: [], permissionInstructions: "", basis: "rider_observed", evidence: [{ kind: "other", description: "Open gate and no signage when I rode it in March 2026." }] };
const photos = [{ mediaId: "11111111-1111-4111-8111-111111111111", altText: "Gravel track along a ridge", caption: "", credit: "" }];
const review = { safetyNotes: "Carry water; no mobile signal in the middle section.", contributorNote: "", licenceAccepted: true };
const full = { basics, route, details, access, photos, review };

const errs = (r: ReturnType<typeof validateStep>) => (r.ok ? {} : r.errors);

describe("validateStep basics", () => {
  it("accepts a complete step and trims text", () => {
    const r = validateStep(1, { ...basics, name: "  Ridge track above the lake  " });
    expect(r.ok && r.value).toMatchObject({ name: "Ridge track above the lake", state: "kerala" });
  });
  it.each([
    ["name", { name: "ab" }],
    ["name", { name: "x".repeat(81) }],
    ["summary", { summary: "Too short." }],
    ["summary", { summary: "x".repeat(401) }],
    ["summary", { summary: "A gravel ridge track, see https://example.com for the full description and more." }],
    ["summary", { summary: "A gravel ridge track, details are on www.example.com and also elsewhere online." }],
    ["state", { state: "" }],
    ["district", { district: "" }],
    ["nearestTown", { nearestTown: "" }],
  ])("rejects a bad %s", (field, patch) => {
    expect(errs(validateStep(1, { ...basics, ...patch }))).toHaveProperty(field);
  });
});

describe("validateStep route", () => {
  it("accepts a start point and a route shape", () => {
    expect(validateStep(2, route).ok).toBe(true);
  });
  it("accepts a start point anywhere on Earth", () => {
    expect(validateStep(2, { ...route, startPoint: { lat: 51.5, lon: -0.1 } }).ok).toBe(true);
  });
  it.each([
    [{ startPoint: { lat: 95, lon: -0.1 } }, "startPoint"],
    [{ startPoint: { lat: 51.5, lon: 200 } }, "startPoint"],
    [{ startPoint: { lat: Number.NaN, lon: 76 } }, "startPoint"],
    [{ startPoint: undefined }, "startPoint"],
    [{ routeShape: "zigzag" }, "routeShape"],
    [{ routeShape: undefined }, "routeShape"],
  ])("rejects %j", (patch, field) => {
    expect(errs(validateStep(2, { ...route, ...patch }))).toHaveProperty(field);
  });
});

describe("validateStep details", () => {
  it("accepts valid details", () => expect(validateStep(3, details).ok).toBe(true));
  it.each([
    [{ difficulty: "impossible" }, "difficulty"],
    [{ terrain: [] }, "terrain"],
    [{ terrain: ["tarmac"] }, "terrain"],
    [{ bestMonths: [0, 13] }, "bestMonths"],
    [{ hazards: ["dragons"] }, "hazards"],
    [{ suitableFor: ["tank"] }, "suitableFor"],
    [{ description: "x".repeat(5001) }, "description"],
  ])("rejects %j", (patch, field) => {
    expect(errs(validateStep(3, { ...details, ...patch }))).toHaveProperty(field);
  });
});

describe("validateStep access", () => {
  it("accepts a public claim with evidence and fixes the level at community_reported", () => {
    const r = validateStep(4, access);
    expect(r.ok && r.value).toMatchObject({ accessClass: "public", level: "community_reported" });
  });
  it("never lets a contributor choose a verified level, even if one is sent", () => {
    const r = validateStep(4, { ...access, level: "officially_verified", verifiedAt: "2026-01-01" });
    expect(r.ok && r.value).toMatchObject({ level: "community_reported" });
    expect(r.ok && Object.keys(r.value)).not.toContain("verifiedAt");
  });
  it("requires permission instructions when permission is required", () => {
    expect(errs(validateStep(4, { ...access, accessClass: "permission_required", permissionInstructions: "" }))).toHaveProperty("permissionInstructions");
    expect(validateStep(4, { ...access, accessClass: "permission_required", permissionInstructions: "Get a pass from the range office in Kalpetta." }).ok).toBe(true);
  });
  it("requires a basis and at least one source unless the access is unknown", () => {
    expect(errs(validateStep(4, { ...access, basis: "none" }))).toHaveProperty("basis");
    expect(errs(validateStep(4, { ...access, evidence: [] }))).toHaveProperty("evidence");
    expect(validateStep(4, { ...access, accessClass: "unknown", basis: "none", evidence: [] })).toMatchObject({ ok: true, value: { level: "unverified" } });
  });
  it.each([
    [{ accessClass: "free" }, "accessClass"],
    [{ restrictions: ["moat"] }, "restrictions"],
    [{ evidence: [{ kind: "url", description: "Notice", url: "javascript:alert(1)" }] }, "evidence"],
    [{ evidence: [{ kind: "url", description: "", url: "https://example.com" }] }, "evidence"],
    [{ evidence: Array.from({ length: 11 }, () => ({ kind: "other", description: "note" })) }, "evidence"],
  ])("rejects %j", (patch, field) => {
    expect(errs(validateStep(4, { ...access, ...patch }))).toHaveProperty(field);
  });
});

describe("validateStep photos", () => {
  it("accepts none, or up to the limit with alt text", () => {
    expect(validateStep(5, []).ok).toBe(true);
    expect(validateStep(5, photos).ok).toBe(true);
  });
  it("requires alt text, valid ids and no duplicates, and caps the count", () => {
    expect(errs(validateStep(5, [{ ...photos[0], altText: "" }]))).toHaveProperty("photos");
    expect(errs(validateStep(5, [{ ...photos[0], mediaId: "nope" }]))).toHaveProperty("photos");
    expect(errs(validateStep(5, [photos[0], photos[0]]))).toHaveProperty("photos");
    const many = Array.from({ length: MAX_PHOTOS + 1 }, (_, i) => ({ ...photos[0], mediaId: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}` }));
    expect(errs(validateStep(5, many))).toHaveProperty("photos");
  });
});

describe("validateStep review", () => {
  it("requires the licence to be accepted", () => {
    expect(validateStep(6, review).ok).toBe(true);
    expect(errs(validateStep(6, { ...review, licenceAccepted: false }))).toHaveProperty("licenceAccepted");
    expect(errs(validateStep(6, { ...review, licenceAccepted: "true" }))).toHaveProperty("licenceAccepted");
  });
  it("limits the note and safety text", () => {
    expect(errs(validateStep(6, { ...review, contributorNote: "x".repeat(1001) }))).toHaveProperty("contributorNote");
    expect(errs(validateStep(6, { ...review, safetyNotes: "x".repeat(2001) }))).toHaveProperty("safetyNotes");
  });
});

describe("validateStep robustness", () => {
  it.each([null, undefined, 42, "text", [], { __proto__: { x: 1 } }])("does not throw for %j", (input) => {
    for (const step of [1, 2, 3, 4, 5, 6] as const) expect(() => validateStep(step, input)).not.toThrow();
  });
  it("drops unknown keys", () => {
    const r = validateStep(1, { ...basics, isAdmin: true, trailId: "x" });
    expect(r.ok && Object.keys(r.value)).not.toContain("isAdmin");
  });
});

describe("validateAll", () => {
  it("accepts a complete submission", () => expect(validateAll(full).ok).toBe(true));
  it("lists the steps that are missing or invalid", () => {
    const r = validateAll({ ...full, access: undefined, photos: undefined });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.steps).toEqual([4]);
  });
  it("re-validates every step rather than trusting stored data", () => {
    const r = validateAll({ ...full, basics: { ...basics, name: "x" } });
    expect(!r.ok && r.steps).toEqual([1]);
  });
  it("covers every field with a step", () => {
    expect(Object.keys(STEP_FIELDS).map(Number)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
