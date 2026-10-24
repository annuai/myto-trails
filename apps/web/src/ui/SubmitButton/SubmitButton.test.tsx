import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const status = vi.hoisted(() => ({ pending: false, data: null as FormData | null }));
vi.mock("react-dom", async (orig) => ({ ...(await orig<typeof import("react-dom")>()), useFormStatus: () => ({ pending: status.pending, data: status.data, method: "post", action: null }) }));

import { SubmitButton } from "./SubmitButton";

describe("SubmitButton", () => {
  it("renders its label and is enabled when idle", () => {
    status.pending = false;
    render(<form><SubmitButton className="x">Post</SubmitButton></form>);
    const b = screen.getByRole("button", { name: "Post" });
    expect(b).toBeEnabled();
    expect(b).not.toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("button-spinner")).toBeNull();
  });

  it("disables itself and shows a spinner while the form is submitting", () => {
    status.pending = true;
    status.data = new FormData();
    render(<form><SubmitButton>Post</SubmitButton></form>);
    const b = screen.getByRole("button", { name: /Post/ });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("button-spinner")).toBeInTheDocument();
  });

  it("with a name and value, only the clicked one shows the spinner", () => {
    status.pending = true;
    const fd = new FormData();
    fd.set("decision", "accept");
    status.data = fd;
    render(<form><SubmitButton name="decision" value="accept">Accept</SubmitButton><SubmitButton name="decision" value="decline">Decline</SubmitButton></form>);
    expect(screen.getAllByTestId("button-spinner")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Accept/ }).querySelector("[data-testid=button-spinner]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
  });
});
