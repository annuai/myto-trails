import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrailCarry } from "./TrailCarry";

describe("TrailCarry", () => {
  it("renders nothing for a trail without it", () => {
    const { container } = render(<TrailCarry carry={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("shows water, items and notes, and the arrival window", () => {
    render(<TrailCarry carry={{ waterLitres: 2.5, items: ["torch", "first_aid"], notes: "Fuel is 40 km back.", arrival: { from: 360, to: 480 }, arrivalNote: "Gates open at 6, hot after 11" }} />);
    expect(screen.getByRole("heading", { name: "What to carry" })).toBeInTheDocument();
    expect(screen.getByText("2.5 L")).toBeInTheDocument();
    expect(screen.getByText("Torch")).toBeInTheDocument();
    expect(screen.getByText("First aid kit")).toBeInTheDocument();
    expect(screen.getByText("Fuel is 40 km back.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Best time to reach" })).toBeInTheDocument();
    expect(screen.getByText("6:00 AM to 8:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Gates open at 6, hot after 11")).toBeInTheDocument();
  });
  it("hides the carry section when only the arrival is given, and the arrival when only the carry is", () => {
    const { rerender } = render(<TrailCarry carry={{ waterLitres: null, items: [], notes: null, arrival: { from: 0, to: 60 }, arrivalNote: null }} />);
    expect(screen.queryByRole("heading", { name: "What to carry" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Best time to reach" })).toBeInTheDocument();
    rerender(<TrailCarry carry={{ waterLitres: 1, items: [], notes: null, arrival: null, arrivalNote: null }} />);
    expect(screen.queryByRole("heading", { name: "Best time to reach" })).toBeNull();
  });
});
