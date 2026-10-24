import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { parseCssVariables } from "./parse";

const read = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
const shared = parseCssVariables(read("tokens.css"));
const trails = parseCssVariables(read("trails.css"));
const all = { ...shared, ...trails };
const v = (name: string) => {
  const value = all[name];
  if (!value) throw new Error(`missing token ${name}`);
  return value;
};

describe("contrastRatio", () => {
  it("matches WCAG for ink on paper", () => {
    expect(contrastRatio("#1a1a1a", "#f2ede8")).toBeGreaterThan(14.9);
  });
  it("is symmetric and 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
  });
});

describe("parseCssVariables", () => {
  it("reads Myto brand red verbatim", () => {
    expect(shared["--color-brand-red"]).toBe("#be3a23");
  });
  it("ignores var() indirections so literal values win", () => {
    expect(parseCssVariables("a{--x:#111}b{--x:var(--y)}")["--x"]).toBe("#111");
  });
  it("lets the last declaration win", () => {
    expect(parseCssVariables("a{--x:#111;--x:#222}")["--x"]).toBe("#222");
  });
});

describe("token contrast", () => {
  const bg = () => v("--color-background");
  it("body text on paper is at least 14:1", () => {
    expect(contrastRatio(v("--color-foreground"), bg())).toBeGreaterThanOrEqual(14);
  });
  it("muted text on paper is at least 4.5:1", () => {
    expect(contrastRatio(v("--color-muted"), bg())).toBeGreaterThanOrEqual(4.5);
  });
  it("accent on paper is at least 7:1 and white on accent at least 7:1", () => {
    expect(contrastRatio(v("--color-accent"), bg())).toBeGreaterThanOrEqual(7);
    expect(contrastRatio("#ffffff", v("--color-accent"))).toBeGreaterThanOrEqual(7);
  });
  it.each(["good", "caution", "stop", "unknown", "info"])("status %s on paper is at least 4.5:1", (s) => {
    expect(contrastRatio(v(`--color-status-${s}`), bg())).toBeGreaterThanOrEqual(4.5);
  });
  it.each(["good", "caution", "stop", "unknown", "info"])("dark status %s on dark is at least 4.5:1", (s) => {
    expect(contrastRatio(v(`--color-status-${s}-dark`), v("--color-dark"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("shared Myto values", () => {
  it.each([
    ["--color-background", "#f2ede8"],
    ["--color-surface", "#f2f0ec"],
    ["--color-foreground", "#1a1a1a"],
    ["--color-muted", "#6b6560"],
    ["--color-border", "#00000014"],
    ["--color-dark", "#1c1c1a"],
    ["--color-clay", "#ddd4c8"],
    ["--color-olive", "#d8dbc9"],
    ["--color-sand", "#ddd7ca"],
    ["--color-stone", "#e3ddd4"],
  ])("%s is %s", (name, value) => {
    expect(shared[name]).toBe(value);
  });
});
