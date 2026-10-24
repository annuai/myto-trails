import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ElevationProfile } from "./ElevationProfile";

const profile = Array.from({ length: 60 }, (_, i) => ({ d: i * 0.4, e: 800 + Math.round(200 * Math.sin(i / 8)) }));

describe("ElevationProfile", () => {
  it("draws the profile as a labelled image with a summary", () => {
    render(<ElevationProfile profile={profile} />);
    const img = screen.getByRole("img", { name: /elevation profile/i });
    expect(img.getAttribute("aria-label")).toMatch(/23\.6 km/);
    expect(img.querySelector("polyline")).not.toBeNull();
  });

  it("offers the same data as a table", () => {
    render(<ElevationProfile profile={profile} />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows.length).toBeLessThanOrEqual(14);
    expect(within(rows[1]!).getAllByRole("cell")[0]).toHaveTextContent("0.0 km");
    expect(within(rows[rows.length - 1]!).getAllByRole("cell")[0]).toHaveTextContent("23.6 km");
  });

  it("renders nothing when there is no usable profile", () => {
    const { container, rerender } = render(<ElevationProfile profile={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ElevationProfile profile={[{ d: 0, e: 10 }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("copes with a flat profile", () => {
    render(<ElevationProfile profile={[{ d: 0, e: 100 }, { d: 5, e: 100 }, { d: 10, e: 100 }]} />);
    expect(screen.getByRole("img").querySelector("polyline")!.getAttribute("points")).not.toMatch(/NaN|Infinity/);
  });
});
