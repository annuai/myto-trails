import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeasonStrip } from "./SeasonStrip";

describe("SeasonStrip", () => {
  it("lists all twelve months", () => {
    render(<SeasonStrip bestMonths={[11, 12, 1]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
  });
  it("marks good months with text, not colour alone", () => {
    render(<SeasonStrip bestMonths={[11, 12, 1]} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).getByText("Good")).toBeInTheDocument(); // Jan
    expect(within(items[1]!).queryByText("Good")).toBeNull(); // Feb
    expect(within(items[10]!).getByText("Good")).toBeInTheDocument(); // Nov
  });
  it("renders nothing when no months are listed", () => {
    const { container } = render(<SeasonStrip bestMonths={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
