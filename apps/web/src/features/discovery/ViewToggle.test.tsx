import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewToggle } from "./ViewToggle";
import { parseSearchParams } from "./search-params";

describe("ViewToggle", () => {
  it("links to both views, keeps filters and resets the page, and marks the current one", () => {
    render(<ViewToggle params={parseSearchParams({ q: "ridge", page: "3" })} />);
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/trails?q=ridge&view=map");
    expect(screen.getByText("List", { selector: "[aria-current=page]" })).toBeInTheDocument();
  });
  it("marks the map when it is active", () => {
    render(<ViewToggle params={parseSearchParams({ view: "map" })} />);
    expect(screen.getByRole("link", { name: "List" })).toHaveAttribute("href", "/trails");
    expect(screen.getByText("Map", { selector: "[aria-current=page]" })).toBeInTheDocument();
  });
});
