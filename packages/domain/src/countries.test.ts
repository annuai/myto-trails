import { describe, expect, it } from "vitest";
import { COUNTRY_CONFIGS, countryConfig, parseCountryConfig } from "./countries";

describe("countryConfig", () => {
  it("finds India whatever the case", () => {
    expect(countryConfig("in")?.emergency.primary).toBe("112");
    expect(countryConfig("IN")?.currency).toBe("INR");
  });
  it("returns null for unknown or missing codes", () => {
    expect(countryConfig("ZZ")).toBeNull();
    expect(countryConfig(null)).toBeNull();
    expect(countryConfig(undefined)).toBeNull();
  });
});

describe("parseCountryConfig", () => {
  it("rejects anything incomplete", () => {
    expect(parseCountryConfig({})).toBeNull();
    expect(parseCountryConfig(null)).toBeNull();
    expect(parseCountryConfig({ ...COUNTRY_CONFIGS.IN, distanceUnit: "yd" })).toBeNull();
    expect(parseCountryConfig({ ...COUNTRY_CONFIGS.IN, emergency: { primary: "", others: [] } })).toBeNull();
    expect(parseCountryConfig({ ...COUNTRY_CONFIGS.IN, emergency: { primary: "112", others: [{ label: "x" }] } })).toBeNull();
  });
  it("round-trips India", () => {
    expect(parseCountryConfig(JSON.parse(JSON.stringify(COUNTRY_CONFIGS.IN)))).toEqual(COUNTRY_CONFIGS.IN);
  });
});
