import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilterPanel } from "./FilterPanel";
import { parseSearchParams } from "./search-params";

describe("FilterPanel", () => {
  it("is a GET form to the trails page", () => {
    const { container } = render(<FilterPanel params={parseSearchParams({})} />);
    const form = container.querySelector("form")!;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/trails");
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
  });
  it("checks the boxes for active filters and leaves others unchecked", () => {
    render(<FilterPanel params={parseSearchParams({ terrain: "mud", difficulty: "hard", verified: "1", closed: "1" })} />);
    expect(screen.getByRole("checkbox", { name: "Mud" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Gravel" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Hard" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Verified only" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Include closed trails" })).toBeChecked();
  });
  it("keeps the search text, place, state and view as hidden fields", () => {
    const { container } = render(<FilterPanel params={parseSearchParams({ q: "ridge", near: "mysuru", radius: "50", state: "kerala", view: "map" })} />);
    const hidden = Object.fromEntries([...container.querySelectorAll("input[type=hidden]")].map((i) => [(i as HTMLInputElement).name, (i as HTMLInputElement).value]));
    expect(hidden).toMatchObject({ q: "ridge", near: "mysuru", radius: "50", state: "kerala", view: "map" });
  });
  it("does not carry the page, so changing filters starts at page 1", () => {
    const { container } = render(<FilterPanel params={parseSearchParams({ page: "4" })} />);
    expect(container.querySelector("input[name=page]")).toBeNull();
  });
  it("shows how many filters are active in the summary", () => {
    render(<FilterPanel params={parseSearchParams({ terrain: "mud,gravel", verified: "1" })} />);
    expect(screen.getByText("Filters (3)")).toBeInTheDocument();
  });
  it("offers a labelled month list and length fields", () => {
    render(<FilterPanel params={parseSearchParams({ month: "11", minKm: "5" })} />);
    expect(screen.getByLabelText("Best month")).toHaveValue("11");
    expect(screen.getByLabelText("Shortest (km)")).toHaveValue(5);
    expect(screen.getByLabelText("Longest (km)")).toHaveValue(null);
  });
});
