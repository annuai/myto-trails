import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "./Breadcrumbs";

describe("Breadcrumbs", () => {
  const items = [{ label: "Home", href: "/" }, { label: "Regions", href: "/regions" }, { label: "Kerala" }];
  it("is a labelled navigation landmark", () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });
  it("links the earlier items and marks the last as the current page", () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getByRole("link", { name: "Regions" })).toHaveAttribute("href", "/regions");
    expect(screen.getByText("Kerala")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Kerala" })).toBeNull();
  });
});
