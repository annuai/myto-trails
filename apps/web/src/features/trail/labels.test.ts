import { describe, expect, it } from "vitest";
import {
  difficultyLabel, formatDuration, formatKm, hazardLabel, monthLabel, restrictionLabel, routeShapeLabel, suitabilityLabel, terrainLabel,
} from "./labels";

describe("formatDuration", () => {
  it.each([[0, "0 min"], [45, "45 min"], [60, "1 h"], [90, "1 h 30 min"], [150, "2 h 30 min"], [1500, "25 h"]])("%i -> %s", (min, text) => {
    expect(formatDuration(min)).toBe(text);
  });
});

describe("formatKm", () => {
  it.each([[24.1, "24.1 km"], [24, "24 km"], [0.5, "0.5 km"], [100.04, "100 km"]])("%d -> %s", (km, text) => {
    expect(formatKm(km)).toBe(text);
  });
});

describe("labels", () => {
  it("uses sentence case words", () => {
    expect(terrainLabel("forest_track")).toBe("Forest track");
    expect(terrainLabel("mud")).toBe("Mud");
    expect(difficultyLabel("expert")).toBe("Expert");
    expect(suitabilityLabel("adventure_tourer")).toBe("Adventure tourer");
    expect(suitabilityLabel("small_displacement")).toBe("Small displacement");
    expect(hazardLabel("slippery_after_rain")).toBe("Slippery after rain");
    expect(hazardLabel("no_mobile_signal")).toBe("No mobile signal");
    expect(routeShapeLabel("point_to_point")).toBe("Point to point");
    expect(restrictionLabel("forest_dept")).toBe("Forest department");
    expect(restrictionLabel("private_estate")).toBe("Private estate");
    expect(restrictionLabel("local_ordinance")).toBe("Local ordinance");
    expect(restrictionLabel("public_land_closure")).toBe("Public land closure");
  });
  it("names months from 1 to 12", () => {
    expect(monthLabel(1)).toBe("Jan");
    expect(monthLabel(12)).toBe("Dec");
  });
});
