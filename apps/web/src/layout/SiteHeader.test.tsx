import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("shows the logo as a link home with an accessible name", () => {
    render(<SiteHeader />);
    const link = screen.getByRole("link", { name: "moto trails" });
    expect(link).toHaveAttribute("href", "/");
    expect(screen.getByRole("img", { name: "moto trails" })).toBeInTheDocument();
  });
});
