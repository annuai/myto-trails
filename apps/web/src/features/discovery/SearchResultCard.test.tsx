import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeTrail } from "../trail/test-trail";
import { SearchResultCard } from "./SearchResultCard";

const item = (o = {}) => ({ ...makeTrail(), lon: 76.1, lat: 11.6, distanceFromKm: 62, travel: { oneWayMin: 130, roundTripMin: 260 }, ...o });

describe("SearchResultCard", () => {
  it("shows the trail row plus distance and travel time when searching near a place", () => {
    render(<SearchResultCard trail={item()} />);
    expect(screen.getByRole("link", { name: "Sample Wayanad ridge track" })).toBeInTheDocument();
    expect(screen.getByText(/62 km away/)).toBeInTheDocument();
    expect(screen.getByText(/≈ 2 h 10 min each way/)).toBeInTheDocument();
  });
  it("omits the travel line without an origin", () => {
    render(<SearchResultCard trail={item({ distanceFromKm: null, travel: null })} />);
    expect(screen.queryByText(/km away/)).toBeNull();
  });
});
