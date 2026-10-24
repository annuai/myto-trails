import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SafetyInformation } from "./SafetyInformation";

describe("SafetyInformation", () => {
  it("lists hazards and the notes", () => {
    render(<SafetyInformation hazards={["river_crossing", "no_fuel"]} safetyNotes="Carry water." />);
    expect(screen.getByText("River crossing")).toBeInTheDocument();
    expect(screen.getByText("No fuel")).toBeInTheDocument();
    expect(screen.getByText("Carry water.")).toBeInTheDocument();
  });
  it("renders nothing without hazards or notes", () => {
    const { container } = render(<SafetyInformation hazards={[]} safetyNotes={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
