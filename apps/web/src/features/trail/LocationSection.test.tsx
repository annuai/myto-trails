import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocationSection, formatCoordinates } from "./LocationSection";
import { makeTrail } from "./test-trail";

vi.mock("@/features/map/PinMap", () => ({ PinMap: ({ label }: { label: string }) => <div data-testid="pin-map">{label}</div> }));

describe("formatCoordinates", () => {
  it("writes degrees with hemisphere letters", () => {
    expect(formatCoordinates(13.169694, 77.483722)).toBe("13.16969° N, 77.48372° E");
    expect(formatCoordinates(-33.5, -70.25)).toBe("33.50000° S, 70.25000° W");
  });
});

describe("LocationSection", () => {
  it("shows the coordinates, links to other maps and a pin map", () => {
    render(<LocationSection trail={makeTrail({ location: { lat: 13.169694, lon: 77.483722 }, name: "Hesarghatta Wetlands", nearestTown: "Hesaraghatta" })} />);
    expect(screen.getByRole("heading", { name: "Where it starts" })).toBeInTheDocument();
    expect(screen.getByText("13.16969° N, 77.48372° E")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute("href", "https://www.google.com/maps?q=13.169694,77.483722");
    expect(screen.getByRole("link", { name: "Open in OpenStreetMap" })).toHaveAttribute("href", expect.stringContaining("openstreetmap.org"));
    expect(screen.getByTestId("pin-map")).toHaveTextContent("Start of Hesarghatta Wetlands");
  });
  it("says the position is approximate for a sensitive trail", () => {
    render(<LocationSection trail={makeTrail({ sensitivity: "sensitive", location: { lat: 25.5, lon: 91.9 } })} />);
    expect(screen.getByRole("heading", { name: "Approximate location" })).toBeInTheDocument();
    expect(screen.getByText(/exact start is not published/i)).toBeInTheDocument();
  });
  it("leaves out the pin map when a route map is already shown", () => {
    render(<LocationSection trail={makeTrail({ location: { lat: 13.1, lon: 77.4 } })} showMap={false} />);
    expect(screen.queryByTestId("pin-map")).toBeNull();
    expect(screen.getByText(/° N,/)).toBeInTheDocument();
  });
  it("renders nothing without a location", () => {
    const { container } = render(<LocationSection trail={makeTrail({ location: null })} />);
    expect(container).toBeEmptyDOMElement();
  });
});
