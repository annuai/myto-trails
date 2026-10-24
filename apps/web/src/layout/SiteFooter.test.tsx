import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("states that Myto Trails is a subsidiary of myto-moto and links to it", () => {
    const { container } = render(<SiteFooter />);
    expect(container.textContent).toContain("Myto Trails is a subsidiary of myto-moto");
    expect(screen.getByRole("link", { name: "myto-moto" })).toHaveAttribute("href", "https://www.myto-moto.com");
  });
  it("links to the donate page", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Donate" })).toHaveAttribute("href", "/donate");
  });
});
