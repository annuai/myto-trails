import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalDocument } from "./LegalDocument";

describe("LegalDocument", () => {
  it("privacy renders its headings and a mailto link", () => {
    render(<LegalDocument slug="privacy" />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Phone numbers" })).toBeInTheDocument();
    const mail = screen.getAllByRole("link", { name: "clubmyto@gmail.com" });
    expect(mail.length).toBeGreaterThan(0);
    for (const a of mail) expect(a).toHaveAttribute("href", "mailto:clubmyto@gmail.com");
  });

  it("shows when the text was last updated", () => {
    render(<LegalDocument slug="terms" />);
    expect(screen.getByText("Last updated 28 October 2026")).toBeInTheDocument();
  });

  it("terms and privacy show the draft banner, about does not", () => {
    const { unmount } = render(<LegalDocument slug="terms" />);
    expect(screen.getByRole("note")).toBeInTheDocument();
    unmount();
    const second = render(<LegalDocument slug="privacy" />);
    expect(screen.getByRole("note")).toBeInTheDocument();
    second.unmount();
    render(<LegalDocument slug="about" />);
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("about links to myto-moto.com", () => {
    render(<LegalDocument slug="about" />);
    expect(screen.getByRole("link", { name: "myto-moto" })).toHaveAttribute("href", "https://myto-moto.com");
  });
});
