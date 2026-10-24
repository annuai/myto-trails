// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TrailImportSchema } from "./schema";

const samples = JSON.parse(readFileSync(fileURLToPath(new URL("../../../data/sample-trails.json", import.meta.url)), "utf8")) as unknown[];

describe("sample-trails.json", () => {
  it("contains six records that all parse and are flagged as samples", () => {
    expect(samples).toHaveLength(6);
    for (const record of samples) {
      const parsed = TrailImportSchema.safeParse(record);
      expect(parsed.success, JSON.stringify(parsed.success ? null : parsed.error.issues)).toBe(true);
      if (parsed.success) {
        expect(parsed.data.sample).toBe(true);
        expect(parsed.data.name.startsWith("Sample")).toBe(true);
      }
    }
  });

  it("covers every access class path the UI must render", () => {
    const parsed = samples.map((s) => TrailImportSchema.parse(s));
    const classes = new Set(parsed.map((p) => p.access.accessClass));
    expect(classes).toEqual(new Set(["public", "permission_required", "restricted", "unknown"]));
    const conditions = new Set(parsed.map((p) => p.condition.status));
    expect(conditions).toEqual(new Set(["open", "seasonal", "temporarily_closed", "permanently_closed", "unknown"]));
    expect(parsed.filter((p) => p.sensitivity !== "standard")).toHaveLength(1);
    expect(parsed.filter((p) => p.state === "kerala").length).toBeGreaterThanOrEqual(3);
  });
});

describe("TrailImportSchema", () => {
  const base = TrailImportSchema.parse(samples[0]);

  it("names the failing field for a too-short summary", () => {
    const result = TrailImportSchema.safeParse({ ...base, summary: "x".repeat(39) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((i) => i.path.join("."))).toContain("summary");
  });

  it("requires a public point for a sensitive trail", () => {
    const result = TrailImportSchema.safeParse({ ...base, sensitivity: "sensitive", publicPoint: undefined });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((i) => i.path.join("."))).toContain("publicPoint");
  });

  it("requires dates and evidence for a moderator-verified assessment", () => {
    const result = TrailImportSchema.safeParse({
      ...base,
      access: { ...base.access, level: "moderator_verified", verifiedAt: undefined, validUntil: undefined, evidence: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects validUntil on or before verifiedAt", () => {
    const result = TrailImportSchema.safeParse({ ...base, access: { ...base.access, verifiedAt: "2026-05-01", validUntil: "2026-05-01" } });
    expect(result.success).toBe(false);
  });
});
