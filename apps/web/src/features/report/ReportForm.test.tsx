import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportForm } from "./ReportForm";

const action = async () => {};

describe("ReportForm", () => {
  it("offers the eight kinds of problem as radio buttons with plain-language labels", () => {
    render(<ReportForm action={action} slug="a-trail" />);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: "The trail is closed" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "The access information is wrong" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "An environmental or land-use concern" })).toBeInTheDocument();
  });
  it("has a labelled details field with the length hint", () => {
    render(<ReportForm action={action} slug="a-trail" />);
    const details = screen.getByLabelText("What did you find?");
    expect(details.tagName).toBe("TEXTAREA");
    expect(details).toHaveAttribute("minlength", "20");
    expect(details).toHaveAttribute("maxlength", "2000");
    expect(details).toBeRequired();
  });
  it("shows validation errors tied to their fields", () => {
    render(<ReportForm action={action} slug="a-trail" errors={{ type: "Choose what kind of problem this is.", details: "Describe the problem in at least 20 characters." }} />);
    expect(screen.getByText("Choose what kind of problem this is.")).toBeInTheDocument();
    const details = screen.getByLabelText("What did you find?");
    expect(details).toHaveAttribute("aria-invalid", "true");
    expect(details.getAttribute("aria-describedby")).toBeTruthy();
  });
  it("keeps what was typed and the chosen type after an error", () => {
    render(<ReportForm action={action} slug="a-trail" values={{ type: "closure", details: "My earlier text that was too short" }} errors={{ details: "x" }} />);
    expect(screen.getByRole("radio", { name: "The trail is closed" })).toBeChecked();
    expect(screen.getByLabelText("What did you find?")).toHaveValue("My earlier text that was too short");
  });
  it("carries the trail slug", () => {
    const { container } = render(<ReportForm action={action} slug="a-trail" />);
    expect((container.querySelector("input[name=slug]") as HTMLInputElement).value).toBe("a-trail");
  });
});
