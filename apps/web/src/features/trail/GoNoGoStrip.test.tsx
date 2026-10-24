import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoNoGoStrip } from "./GoNoGoStrip";
import { makeTrail } from "./test-trail";

describe("GoNoGoStrip", () => {
  it("shows access, condition and verification as words", () => {
    render(<GoNoGoStrip trail={makeTrail({ accessClass: "permission_required", condition: "seasonal" })} />);
    expect(screen.getByText("Permission required")).toBeInTheDocument();
    expect(screen.getByText("Seasonal access")).toBeInTheDocument();
    expect(screen.getByText("Moderator verified")).toBeInTheDocument();
    expect(screen.getByText("15 Jan 2026")).toBeInTheDocument();
  });
  it("shows the stats line", () => {
    render(<GoNoGoStrip trail={makeTrail()} />);
    expect(screen.getByText("24.1 km")).toBeInTheDocument();
    expect(screen.getByText("2 h 30 min")).toBeInTheDocument();
    expect(screen.getByText("+612 m")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
  });
  it("omits stats that are not known", () => {
    render(<GoNoGoStrip trail={makeTrail({ distanceKm: null, estDurationMin: null, elevationGainM: null })} />);
    expect(screen.queryByText(/km/)).toBeNull();
    expect(screen.queryByText(/ h /)).toBeNull();
  });
  it("says a re-check is needed when verification has expired", () => {
    render(<GoNoGoStrip trail={makeTrail({ verification: { level: "unverified", needsRecheck: true } })} />);
    expect(screen.getByText("Needs re-check")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });
  it("does not say re-check when verification is current", () => {
    render(<GoNoGoStrip trail={makeTrail()} />);
    expect(screen.queryByText("Needs re-check")).toBeNull();
  });
  it("never renders a download control", () => {
    render(<GoNoGoStrip trail={makeTrail()} />);
    expect(screen.queryByRole("link", { name: /gpx|download/i })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
