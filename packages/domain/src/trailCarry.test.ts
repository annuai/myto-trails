import { describe, expect, it } from "vitest";
import { CARRY_ITEMS, CARRY_ITEM_LABEL, WOMEN_SAFE_CONFIRMED_AT, arrivalText, hhmmToMinutes, minutesToHhmm } from "./trailCarry";

describe("arrivalText", () => {
  it("writes a morning window", () => expect(arrivalText(360, 480)).toBe("6:00 AM to 8:00 AM"));
  it("handles noon, midnight and the afternoon", () => {
    expect(arrivalText(0, 720)).toBe("12:00 AM to 12:00 PM");
    expect(arrivalText(735, 1439)).toBe("12:15 PM to 11:59 PM");
    expect(arrivalText(810, 1005)).toBe("1:30 PM to 4:45 PM");
  });
});

describe("hhmm helpers", () => {
  it("round-trips a time of day", () => {
    expect(hhmmToMinutes("06:00")).toBe(360);
    expect(hhmmToMinutes("23:59")).toBe(1439);
    expect(minutesToHhmm(360)).toBe("06:00");
    expect(minutesToHhmm(1439)).toBe("23:59");
  });
  it("rejects anything that is not a time of day", () => {
    for (const s of ["", "6:00", "24:00", "12:60", "ab:cd", "12:00:00"]) expect(hhmmToMinutes(s)).toBeNull();
  });
});

describe("carry items", () => {
  it("has 14 ids in the agreed order, each with a sentence-case label", () => {
    expect(CARRY_ITEMS).toHaveLength(14);
    expect(CARRY_ITEMS[0]).toBe("puncture_kit");
    expect(CARRY_ITEMS[13]).toBe("warm_layer");
    for (const id of CARRY_ITEMS) expect(CARRY_ITEM_LABEL[id]).toMatch(/^[A-Z][a-z]/);
    expect(CARRY_ITEM_LABEL.puncture_kit).toBe("Puncture repair kit");
  });
  it("needs three riders to confirm a trail as safe for women riders", () => expect(WOMEN_SAFE_CONFIRMED_AT).toBe(3));
});
