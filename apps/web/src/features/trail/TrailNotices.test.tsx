import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrailNotices } from "./TrailNotices";
import { makeTrail } from "./test-trail";

describe("TrailNotices", () => {
  it("renders nothing for a public, open, real trail", () => {
    const { container } = render(<TrailNotices trail={makeTrail()} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("shows the sample banner only for sample trails", () => {
    const { rerender } = render(<TrailNotices trail={makeTrail({ isSample: true })} />);
    expect(screen.getByText("Sample data for development. This is not a real trail.")).toBeInTheDocument();
    rerender(<TrailNotices trail={makeTrail({ isSample: false })} />);
    expect(screen.queryByText(/Sample data for development/)).toBeNull();
  });
  it("shows permission instructions", () => {
    render(<TrailNotices trail={makeTrail({ accessClass: "permission_required", permissionInstructions: "Ask at the estate office." })} />);
    expect(screen.getByText("Permission required")).toBeInTheDocument();
    expect(screen.getByText("Ask at the estate office.")).toBeInTheDocument();
  });
  it("tells riders not to ride a private trail", () => {
    render(<TrailNotices trail={makeTrail({ accessClass: "private_no_access" })} />);
    expect(screen.getByText("Do not ride this trail")).toBeInTheDocument();
  });
  it("warns that unknown access must not be assumed", () => {
    render(<TrailNotices trail={makeTrail({ accessClass: "unknown" })} />);
    expect(screen.getByText("Access unknown. Do not assume permission to ride here.")).toBeInTheDocument();
  });
  it("shows a temporary closure with its reason and expected date", () => {
    render(<TrailNotices trail={makeTrail({ condition: "temporarily_closed", conditionReason: "landslide", conditionExpectedUntil: "2026-12-01" })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Temporarily closed");
    expect(screen.getByRole("alert")).toHaveTextContent("Landslide");
    expect(screen.getByRole("alert")).toHaveTextContent("1 Dec 2026");
  });
  it("shows a permanently closed notice", () => {
    render(<TrailNotices trail={makeTrail({ condition: "permanently_closed" })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Permanently closed");
  });
  it("shows the unknown condition fallback", () => {
    render(<TrailNotices trail={makeTrail({ condition: "unknown" })} />);
    expect(screen.getByText("Condition unknown")).toBeInTheDocument();
  });
  it("shows seasonal notes", () => {
    render(<TrailNotices trail={makeTrail({ condition: "seasonal", seasonNotes: "Closed June to September." })} />);
    expect(screen.getByText("Closed June to September.")).toBeInTheDocument();
  });
});
