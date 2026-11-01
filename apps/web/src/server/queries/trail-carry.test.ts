import { describe, expect, it } from "vitest";
import { mapCarry } from "./trails.sql";

const none = { water_litres: null, carry: [], carry_notes: null, arrival_from_min: null, arrival_to_min: null, arrival_note: null };

describe("mapCarry", () => {
  it("is null for a trail that gives none of it", () => expect(mapCarry(none)).toBeNull());
  it("is null for rows from before the columns existed", () => expect(mapCarry({})).toBeNull());
  it("reads numeric strings from the database and keeps item order", () => {
    expect(mapCarry({ ...none, water_litres: "2.5", carry: ["torch", "cash"] })).toEqual({ waterLitres: 2.5, items: ["torch", "cash"], notes: null, arrival: null, arrivalNote: null });
  });
  it("keeps a window of 0 minutes to midnight, and a note alone", () => {
    expect(mapCarry({ ...none, arrival_from_min: 0, arrival_to_min: 0 })?.arrival).toEqual({ from: 0, to: 0 });
    expect(mapCarry({ ...none, arrival_note: "Gates open at 6" })).toMatchObject({ arrival: null, arrivalNote: "Gates open at 6" });
  });
});
