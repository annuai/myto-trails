import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActiveFilterList } from "./ActiveFilterList";
import { parseSearchParams } from "./search-params";

describe("ActiveFilterList", () => {
  it("renders nothing for default search", () => {
    const { container } = render(<ActiveFilterList params={parseSearchParams({})} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("lists active filters with removal links that drop only that filter", () => {
    render(<ActiveFilterList params={parseSearchParams({ q: "ridge", terrain: "mud,gravel", state: "kerala", page: "3" })} />);
    const remove = screen.getByRole("link", { name: "Remove Mud filter" });
    expect(remove).toHaveAttribute("href", "/trails?q=ridge&state=kerala&terrain=gravel");
    expect(screen.getByRole("link", { name: "Remove Kerala filter" })).toHaveAttribute("href", "/trails?q=ridge&terrain=mud%2Cgravel");
    expect(screen.getByRole("link", { name: "Remove search ridge" })).toHaveAttribute("href", "/trails?state=kerala&terrain=mud%2Cgravel");
  });
  it("offers to clear everything", () => {
    render(<ActiveFilterList params={parseSearchParams({ terrain: "mud" })} />);
    expect(screen.getByRole("link", { name: "Clear all" })).toHaveAttribute("href", "/trails");
  });
  it("shows closed trails as an active choice that can be undone", () => {
    render(<ActiveFilterList params={parseSearchParams({ closed: "1" })} />);
    expect(screen.getByRole("link", { name: "Remove Including closed trails filter" })).toHaveAttribute("href", "/trails");
  });
  it("describes a place search and its radius without exposing coordinates", () => {
    render(<ActiveFilterList params={parseSearchParams({ near: "bengaluru", radius: "100" })} placeName="Bengaluru" />);
    expect(screen.getByText(/Within 100 km of Bengaluru/)).toBeInTheDocument();
  });
});
