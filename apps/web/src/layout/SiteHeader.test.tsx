import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
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
  it("has a Submit a trail button", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Submit a trail" })).toHaveAttribute("href", "/submit");
  });
  it("opens a menu with the same links on small screens", async () => {
    render(<SiteHeader />);
    expect(screen.getAllByRole("navigation", { name: "Primary" })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getAllByRole("navigation", { name: "Primary" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
  });
  it("becomes a floating bar after scrolling", () => {
    const { container } = render(<SiteHeader />);
    expect(container.querySelector("header > div")!.className).not.toContain("rounded-full");
    Object.defineProperty(window, "scrollY", { configurable: true, value: 200 });
    act(() => void window.dispatchEvent(new Event("scroll")));
    expect(container.querySelector("header > div")!.className).toContain("rounded-full");
  });
});
