import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/discovery/SearchCombobox", () => ({ SearchCombobox: () => <div data-testid="search" /> }));
vi.mock("@/features/discovery/NearMeButton", () => ({ NearMeButton: () => <div data-testid="near-me" /> }));

import { Hero } from "./Hero";

describe("Hero", () => {
  it("names the section with both headline lines, once, for screen readers", () => {
    render(<Hero imageSrc="/x.webp" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveAccessibleName("Find a trail you can actually ride. Escape and connect.");
  });

  it("shows the two lines on top of each other so they can fade between, and hides the visual copies from assistive technology", () => {
    render(<Hero imageSrc="/x.webp" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    const visual = h1.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(visual).not.toBeNull();
    expect(within(visual).getByText("Find a trail you can actually ride.")).toHaveClass("hero-line-a");
    expect(within(visual).getByText("Escape and connect.")).toHaveClass("hero-line-b");
  });

  it("keeps the search, near me button and quick searches", () => {
    render(<Hero imageSrc="/x.webp" />);
    expect(screen.getByTestId("search")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Western Ghats" })).toHaveAttribute("href", "/trails?q=ghats");
  });
});
