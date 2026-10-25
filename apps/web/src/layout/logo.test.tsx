// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const svg = readFileSync(new URL("../../public/brand/moto-trails-logo.svg", import.meta.url), "utf8");
const header = readFileSync(new URL("./SiteHeader.tsx", import.meta.url), "utf8");
const footer = readFileSync(new URL("./SiteFooter.tsx", import.meta.url), "utf8");

const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
const fileRatio = Number(viewBox![1]) / Number(viewBox![2]);
const declared = (source: string) => {
  const m = /<Image src="\/brand\/moto-trails-logo\.svg"[^>]*width=\{(\d+)\} height=\{(\d+)\}/.exec(source);
  return Number(m![1]) / Number(m![2]);
};

describe("logo", () => {
  it("has a viewBox, so it scales cleanly", () => {
    expect(viewBox).not.toBeNull();
  });
  it("is shown in the header and the footer at the file's own proportions, so it is never squeezed or stretched", () => {
    expect(Math.abs(declared(header) / fileRatio - 1)).toBeLessThan(0.01);
    expect(Math.abs(declared(footer) / fileRatio - 1)).toBeLessThan(0.01);
  });
  it("is plain vector shapes: no scripts, no external images", () => {
    expect(svg).not.toMatch(/<script|<image|<foreignObject|xlink:href="http/i);
  });
});
