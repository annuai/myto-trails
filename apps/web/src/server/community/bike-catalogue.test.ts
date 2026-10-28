// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bikeImageKey, makeSlug, parseCatalogue, parseCsv, slugOfImageFile, variantWidths } from "./bike-catalogue";

const HEAD = "slug,make,model,category,engine_cc,year_from,year_to\n";

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, CRLF, a BOM and blank lines", () => {
    expect(parseCsv('﻿a,"b,c","d ""e"""\r\n\r\nx,y,z\n')).toEqual([["a", "b,c", 'd "e"'], ["x", "y", "z"]]);
  });
  it("keeps empty fields and a last line without a newline", () => expect(parseCsv("a,,c\nd,e,")).toEqual([["a", "", "c"], ["d", "e", ""]]));
});

describe("parseCatalogue", () => {
  it("reads rows with optional numbers", () => {
    expect(parseCatalogue(`${HEAD}royal-enfield-scram-411,Royal Enfield,Scram 411,adventure,411,2022,\n`)).toEqual([
      { slug: "royal-enfield-scram-411", make: "Royal Enfield", model: "Scram 411", category: "adventure", engineCc: 411, yearFrom: 2022, yearTo: null },
    ]);
  });
  it.each([
    ["a wrong header", "slug,make\nx,y\n", /header/],
    ["an invalid slug", `${HEAD}Bad Slug,A,B,retro,,,\n`, /valid slug/],
    ["a duplicate slug", `${HEAD}a-b,A,B,retro,,,\na-b,A,C,retro,,,\n`, /duplicate/],
    ["an unknown category", `${HEAD}a-b,A,B,hovercraft,,,\n`, /category/],
    ["a bad engine size", `${HEAD}a-b,A,B,retro,big,,\n`, /engine_cc/],
    ["years the wrong way round", `${HEAD}a-b,A,B,retro,,2020,2010\n`, /year_to/],
    ["a short row", `${HEAD}a-b,A,B\n`, /columns/],
  ])("refuses %s", (_n, text, re) => expect(() => parseCatalogue(text)).toThrow(re));
  it("accepts the shipped catalogue: 363 models", () => {
    const rows = parseCatalogue(readFileSync(new URL("../../../data/bikes/catalogue.csv", import.meta.url), "utf8"));
    expect(rows).toHaveLength(363);
  });
});

describe("makeSlug", () => {
  it.each([["Harley-Davidson", "harley-davidson"], ["Moto Morini", "moto-morini"], ["CFMoto", "cfmoto"]])("%s", (n, s) => expect(makeSlug(n)).toBe(s));
});

describe("slugOfImageFile", () => {
  it.each([["royal-enfield-scram-411.png", "royal-enfield-scram-411"], ["a.webp", "a"], ["x-1.JPG", null], ["Notes.txt", null], [".DS_Store", null], ["bad_slug.png", null], ["a--b.png", null]])("%s -> %s", (n, s) => expect(slugOfImageFile(n)).toBe(s));
});

describe("variantWidths", () => {
  it("never enlarges", () => {
    expect(variantWidths(1538)).toEqual([400, 800, 1200]);
    expect(variantWidths(900)).toEqual([400, 800]);
    expect(variantWidths(300)).toEqual([300]);
  });
});

describe("bikeImageKey", () => { it("names the object after the slug and width", () => expect(bikeImageKey("a-b", 800)).toBe("bike/a-b-800.webp")); });
