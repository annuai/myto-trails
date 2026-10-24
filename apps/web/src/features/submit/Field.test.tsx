import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";

describe("Field", () => {
  it("ties the hint and error to the input and marks it invalid", () => {
    render(<Field label="Name" name="name" hint="3 to 80 characters." error="Too short."><input id="name" name="name" /></Field>);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const ids = input.getAttribute("aria-describedby")!.split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual(["3 to 80 characters.", "Too short."]);
  });
  it("adds nothing when there is no hint or error", () => {
    render(<Field label="Name" name="name"><input id="name" name="name" /></Field>);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-describedby");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });
});
