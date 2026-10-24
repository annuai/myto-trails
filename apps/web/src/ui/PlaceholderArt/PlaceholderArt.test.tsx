import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaceholderArt, paletteFor } from "./PlaceholderArt";

describe("PlaceholderArt", () => {
  it("is decorative and hidden from assistive technology", () => {
    render(<PlaceholderArt slug="a" />);
    expect(screen.getByTestId("placeholder-art")).toHaveAttribute("aria-hidden", "true");
  });
  it("picks the same palette for the same slug and spreads different slugs", () => {
    expect(paletteFor("ridge")).toEqual(paletteFor("ridge"));
    expect(new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((s) => paletteFor(s)[1])).size).toBeGreaterThan(2);
  });
});
