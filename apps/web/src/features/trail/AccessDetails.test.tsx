import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccessDetails } from "./AccessDetails";
import { makeTrail } from "./test-trail";

describe("AccessDetails", () => {
  it("shows instructions, restrictions and the number of sources", () => {
    render(
      <AccessDetails
        trail={makeTrail({
          accessClass: "permission_required",
          permissionInstructions: "Ask at the estate office on weekdays.",
          restrictions: ["private_estate", "permit"],
          evidenceCount: 2,
          evidenceKinds: ["written_confirmation", "signage_photo"],
        })}
      />,
    );
    expect(screen.getByText("Ask at the estate office on weekdays.")).toBeInTheDocument();
    expect(screen.getByText("Private estate")).toBeInTheDocument();
    expect(screen.getByText("Permit")).toBeInTheDocument();
    expect(screen.getByText("2 sources")).toBeInTheDocument();
  });
  it("uses the singular for one source and says so when there are none", () => {
    const { rerender } = render(<AccessDetails trail={makeTrail({ evidenceCount: 1 })} />);
    expect(screen.getByText("1 source")).toBeInTheDocument();
    rerender(<AccessDetails trail={makeTrail({ evidenceCount: 0 })} />);
    expect(screen.getByText("No sources recorded")).toBeInTheDocument();
  });
  it("shows the last verified date", () => {
    render(<AccessDetails trail={makeTrail({ verifiedAt: "2026-01-15" })} />);
    expect(screen.getByText(/15 Jan 2026/)).toBeInTheDocument();
  });
});
