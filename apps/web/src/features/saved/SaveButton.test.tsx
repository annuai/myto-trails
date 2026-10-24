import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaveButton } from "./SaveButton";

describe("SaveButton", () => {
  it("sends signed-out visitors to sign in and back to the trail", () => {
    render(<SaveButton slug="a-trail" signedIn={false} initialSaved={false} save={vi.fn()} unsave={vi.fn()} />);
    const link = screen.getByRole("link", { name: "Save trail" });
    expect(link).toHaveAttribute("href", "/sign-in?next=%2Ftrails%2Fa-trail");
  });

  it("is a toggle button for signed-in riders", () => {
    render(<SaveButton slug="a-trail" signedIn initialSaved={false} save={vi.fn()} unsave={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Save trail" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("saves and updates immediately, then unsaves", async () => {
    const save = vi.fn(async () => ({ ok: true }));
    const unsave = vi.fn(async () => ({ ok: true }));
    render(<SaveButton slug="a-trail" signedIn initialSaved={false} save={save} unsave={unsave} />);
    fireEvent.click(screen.getByRole("button", { name: "Save trail" }));
    expect(await screen.findByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
    expect(save).toHaveBeenCalledWith("a-trail");
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(await screen.findByRole("button", { name: "Save trail" })).toHaveAttribute("aria-pressed", "false");
    expect(unsave).toHaveBeenCalledWith("a-trail");
  });

  it("reverts and explains when saving fails", async () => {
    render(<SaveButton slug="a-trail" signedIn initialSaved={false} save={vi.fn(async () => ({ ok: false }))} unsave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save trail" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/couldn.t save/i));
    expect(screen.getByRole("button", { name: "Save trail" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reverts when the action throws", async () => {
    render(<SaveButton slug="a-trail" signedIn initialSaved save={vi.fn()} unsave={vi.fn(async () => { throw new Error("network"); })} />);
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/couldn.t/i));
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
  });
});
