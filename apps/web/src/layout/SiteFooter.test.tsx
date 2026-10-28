import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { versionLabel } from "@moto-trails/domain";
import pkg from "../../package.json";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("says Moto Trails is a project by myto-moto and links to myto-moto.com", () => {
    const { container } = render(<SiteFooter />);
    expect(container.textContent).toContain("Moto Trails is a project by myto-moto");
    expect(screen.getByRole("link", { name: "myto-moto" })).toHaveAttribute("href", "https://myto-moto.com");
  });
  it("shows the copyright as myto-moto", () => {
    const { container } = render(<SiteFooter />);
    expect(container.textContent).toContain("© myto-moto");
    expect(container.textContent).not.toContain("© Moto Trails");
  });
  it("links to the donate page", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Donate" })).toHaveAttribute("href", "/donate");
  });
  it("links to the regions hub", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Regions" })).toHaveAttribute("href", "/regions");
  });
  it("shows the version and Proudly made in India", () => {
    const { container } = render(<SiteFooter />);
    expect(container.textContent).toContain(versionLabel(pkg.version)); // follows the release bot, so no edit per release
    expect(versionLabel(pkg.version)).toMatch(/^v\d+\.\d+\.\d+/);
    expect(container.textContent).toContain("Proudly made in India");
  });
  it("links to About, Terms and Privacy", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getAllByRole("link", { name: "Terms" })[0]).toHaveAttribute("href", "/terms");
    expect(screen.getAllByRole("link", { name: "Privacy" })[0]).toHaveAttribute("href", "/privacy");
  });
});
