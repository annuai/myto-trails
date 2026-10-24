import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DonateContent } from "./DonateContent";

describe("DonateContent", () => {
  it("says plainly who receives the money and that it is not a charity donation", () => {
    render(<DonateContent url={undefined} />);
    expect(screen.getByText(/Myto/)).toBeInTheDocument();
    expect(screen.getByText(/not a charity/i)).toBeInTheDocument();
    expect(screen.getByText(/not tax-deductible/i)).toBeInTheDocument();
  });
  it("shows a Donate link to the hosted payment page when one is configured", () => {
    render(<DonateContent url="https://pay.example.com/moto" />);
    const link = screen.getByRole("link", { name: "Donate" });
    expect(link).toHaveAttribute("href", "https://pay.example.com/moto");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
  it("says donations are not open yet, with no link, when none is configured or the link is unsafe", () => {
    const { rerender } = render(<DonateContent url={undefined} />);
    expect(screen.queryByRole("link", { name: "Donate" })).toBeNull();
    expect(screen.getByText(/not open yet/i)).toBeInTheDocument();
    rerender(<DonateContent url="javascript:alert(1)" />);
    expect(screen.queryByRole("link", { name: "Donate" })).toBeNull();
  });
});
