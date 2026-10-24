import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RouteDto } from "@/server/queries/types";
import { RouteSection } from "./RouteSection";
import { makeTrail } from "./test-trail";

vi.mock("@/features/map/RouteMap", () => ({ RouteMap: () => <div data-testid="route-map" /> }));

const route: RouteDto = {
  distanceKm: 23.64,
  elevGainM: 640,
  elevLossM: 610,
  minElevM: 700,
  maxElevM: 1320,
  pointCount: 800,
  profile: [{ d: 0, e: 700 }, { d: 23.64, e: 1320 }],
  line: [[76.1, 11.6], [76.2, 11.7]],
};

describe("RouteSection", () => {
  it("shows the statistics, the map and the profile", () => {
    render(<RouteSection trail={makeTrail({ hasGpx: true })} route={route} />);
    expect(screen.getByRole("heading", { name: "Route" })).toBeInTheDocument();
    expect(screen.getByText("Distance", { selector: "dt" }).nextElementSibling).toHaveTextContent("23.6 km");
    expect(screen.getByText("+640 m")).toBeInTheDocument();
    expect(screen.getByText("−610 m")).toBeInTheDocument();
    expect(screen.getByTestId("route-map")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /elevation profile/i })).toBeInTheDocument();
  });

  it("links to the download page only when the trail may be downloaded", () => {
    const { rerender } = render(<RouteSection trail={makeTrail({ hasGpx: true })} route={route} />);
    expect(screen.getByRole("link", { name: /download gpx/i })).toHaveAttribute("href", "/trails/sample-wayanad-ridge-track/download");
    rerender(<RouteSection trail={makeTrail({ hasGpx: true, condition: "permanently_closed" })} route={route} />);
    expect(screen.queryByRole("link", { name: /download gpx/i })).toBeNull();
    rerender(<RouteSection trail={makeTrail({ hasGpx: false })} route={route} />);
    expect(screen.queryByRole("link", { name: /download gpx/i })).toBeNull();
  });

  it("omits missing elevation figures and renders nothing without a route", () => {
    const { container, rerender } = render(<RouteSection trail={makeTrail()} route={{ ...route, elevGainM: null, elevLossM: null, profile: null }} />);
    expect(screen.queryByText(/Climb/)).toBeNull();
    rerender(<RouteSection trail={makeTrail()} route={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
