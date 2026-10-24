import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignInForm } from "./SignInForm";

describe("SignInForm", () => {
  const action = async () => {};
  it("asks for an email address with a visible label and submit button", () => {
    render(<SignInForm action={action} next="/saved" />);
    const input = screen.getByLabelText("Email address");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input).toBeRequired();
    expect(screen.getByRole("button", { name: "Email me a sign-in link" })).toBeInTheDocument();
  });
  it("keeps the next path in a hidden field", () => {
    const { container } = render(<SignInForm action={action} next="/saved" />);
    expect((container.querySelector("input[name=next]") as HTMLInputElement).value).toBe("/saved");
  });
  it("shows a message passed in, in a live region", () => {
    render(<SignInForm action={action} next="/" message="Too many requests. Try again later." />);
    expect(screen.getByRole("status")).toHaveTextContent("Too many requests. Try again later.");
  });
});
