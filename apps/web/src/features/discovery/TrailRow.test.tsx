import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeTrail } from "../trail/test-trail";
import { TrailRow } from "./TrailRow";

describe("TrailRow", () => {
  it("links the trail name to its page", () => {
    render(<TrailRow trail={makeTrail({ name: "Sample ridge" })} />);
    expect(screen.getByRole("link", { name: "Sample ridge" })).toHaveAttribute("href", "/trails/sample-wayanad-ridge-track");
  });
  it("shows access and condition as words and the key facts", () => {
    render(<TrailRow trail={makeTrail({ accessClass: "permission_required", condition: "seasonal" })} />);
    expect(screen.getByText("Permission required")).toBeInTheDocument();
    expect(screen.getByText("Seasonal access")).toBeInTheDocument();
    expect(screen.getByText(/24\.1 km/)).toBeInTheDocument();
    expect(screen.getByText(/Moderate/)).toBeInTheDocument();
    expect(screen.getByText(/Wayanad, Kerala/)).toBeInTheDocument();
  });
  it("shows the verification date, or a re-check note when it has expired", () => {
    const { rerender } = render(<TrailRow trail={makeTrail()} />);
    expect(screen.getByText(/Verified 15 Jan 2026/)).toBeInTheDocument();
    rerender(<TrailRow trail={makeTrail({ verification: { level: "unverified", needsRecheck: true } })} />);
    expect(screen.getByText(/Needs re-check/)).toBeInTheDocument();
  });
  it("marks sample trails", () => {
    const { rerender } = render(<TrailRow trail={makeTrail({ isSample: true })} />);
    expect(screen.getByText("Sample")).toBeInTheDocument();
    rerender(<TrailRow trail={makeTrail({ isSample: false })} />);
    expect(screen.queryByText("Sample")).toBeNull();
  });
});
