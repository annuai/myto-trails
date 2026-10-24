import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountMenu } from "./AccountMenu";

describe("AccountMenu", () => {
  it("offers sign in when nobody is signed in", () => {
    render(<AccountMenu user={null} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("link", { name: "Saved" })).toBeNull();
  });
  it("offers Saved and Account when signed in, and never shows the email", () => {
    render(<AccountMenu user={{ displayName: "Asha", email: "asha@example.test" }} />);
    expect(screen.getByRole("link", { name: "Saved" })).toHaveAttribute("href", "/saved");
    expect(screen.getByRole("link", { name: /Account/ })).toHaveAttribute("href", "/account");
    expect(screen.queryByText(/asha@example\.test/)).toBeNull();
  });
});
