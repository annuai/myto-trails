import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TravelTime } from "./TravelTime";

describe("TravelTime", () => {
  it("shows an approximate time each way and for the round trip", () => {
    render(<TravelTime distanceKm={62} oneWayMin={130} roundTripMin={260} />);
    expect(screen.getByText(/≈ 2 h 10 min each way/)).toBeInTheDocument();
    expect(screen.getByText(/round trip ≈ 4 h 20 min/)).toBeInTheDocument();
    expect(screen.getByText(/62 km away/)).toBeInTheDocument();
  });
  it("rounds the distance for display", () => {
    render(<TravelTime distanceKm={61.7} oneWayMin={60} roundTripMin={120} />);
    expect(screen.getByText(/62 km away/)).toBeInTheDocument();
  });
  it("says a trail is very close when under 1 km", () => {
    render(<TravelTime distanceKm={0.4} oneWayMin={0} roundTripMin={0} />);
    expect(screen.getByText(/Under 1 km away/)).toBeInTheDocument();
  });
});
