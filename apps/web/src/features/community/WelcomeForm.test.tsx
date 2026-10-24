import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WelcomeForm } from "./WelcomeForm";

describe("WelcomeForm", () => {
  it("requires the 18+ and driving-licence declaration, a visibility choice, and offers the private women-rider option", () => {
    render(<WelcomeForm action={vi.fn(async () => ({}))} next="/trails" displayName="Annuai" />);
    expect(screen.getByLabelText(/I am 18 or older and I hold a valid driving licence/)).toBeRequired();
    expect(screen.getByLabelText(/Keep me private/)).toBeChecked();
    expect(screen.getByLabelText(/Show me to other riders/)).not.toBeChecked();
    expect(screen.getByLabelText(/I am a woman rider/)).not.toBeChecked();
    expect(screen.getByText(/never shown on your profile/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Your name on Moto Trails")).toHaveValue("Annuai");
  });
});
