import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("shows the status word, not colour alone", () => {
    render(<StatusBadge kind="access" value="permission_required" />);
    expect(screen.getByText("Permission required")).toBeInTheDocument();
  });
  it("hides the decorative glyph from assistive technology", () => {
    const { container } = render(<StatusBadge kind="condition" value="open" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("renders a verification date in day month year form", () => {
    render(<StatusBadge kind="verification" value="moderator_verified" date="2026-08-14" />);
    expect(screen.getByText("14 Aug 2026")).toBeInTheDocument();
  });
});
