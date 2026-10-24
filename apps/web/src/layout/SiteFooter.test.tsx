import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("says Moto Trails is a project by myto-moto and links to myto-moto.com", () => {
    const { container } = render(<SiteFooter />);
    expect(container.textContent).toContain("Moto Trails is a project by myto-moto");
    expect(screen.getByRole("link", { name: "myto-moto" })).toHaveAttribute("href", "https://myto-moto.com");
  });
  it("links to the donate page", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Donate" })).toHaveAttribute("href", "/donate");
  });
  it("links to the regions hub", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Regions" })).toHaveAttribute("href", "/regions");
  });
});
