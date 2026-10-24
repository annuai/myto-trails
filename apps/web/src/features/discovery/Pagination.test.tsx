import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination } from "./Pagination";
import { parseSearchParams } from "./search-params";

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination params={parseSearchParams({})} total={20} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("links previous and next and marks the current page", () => {
    render(<Pagination params={parseSearchParams({ q: "x", page: "2" })} total={65} />);
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute("href", "/trails?q=x");
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute("href", "/trails?q=x&page=3");
    expect(screen.getByText("2", { selector: "[aria-current=page]" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });
  it("hides previous on the first page and next on the last", () => {
    const { rerender } = render(<Pagination params={parseSearchParams({})} total={45} />);
    expect(screen.queryByRole("link", { name: "Previous page" })).toBeNull();
    rerender(<Pagination params={parseSearchParams({ page: "3" })} total={45} />);
    expect(screen.queryByRole("link", { name: "Next page" })).toBeNull();
  });
});
