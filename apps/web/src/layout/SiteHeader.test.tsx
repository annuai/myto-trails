import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("shows the logo as a link home with an accessible name", () => {
    render(<SiteHeader />);
    const link = screen.getByRole("link", { name: "Moto Trails" });
    expect(link).toHaveAttribute("href", "/");
    expect(screen.getByRole("img", { name: "Moto Trails" })).toBeInTheDocument();
  });
  it("has a primary navigation with Explore, Map and Regions", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("href", "/trails");
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute("href", "/trails?view=map");
    expect(screen.getByRole("link", { name: "Regions" })).toHaveAttribute("href", "/regions");
  });
});
