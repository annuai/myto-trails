import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RiddenSummary } from "@/server/community/ridden";
import { RiddenPanel } from "./RiddenPanel";

const actions = { mark: vi.fn(), unmark: vi.fn() };
const summary = (o: Partial<RiddenSummary> = {}): RiddenSummary => ({ count: 0, lastRidden: null, riders: [], unlisted: 0, mine: null, ...o });
const base = { slug: "ridge", maxMonth: "2026-10", actions };

describe("RiddenPanel", () => {
  it("says nobody has ridden here yet, and sends signed-out visitors to sign in and back", () => {
    render(<RiddenPanel {...base} summary={summary()} signedIn={false} />);
    expect(screen.getByText(/nobody has said they have ridden here yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "I've ridden here" })).toHaveAttribute("href", "/sign-in?next=%2Ftrails%2Fridge%23riders");
  });

  it("shows the count, the latest ride, listed riders and the number kept private, with the self-reported note", () => {
    render(<RiddenPanel {...base} signedIn summary={summary({ count: 3, lastRidden: "2026-09-01", unlisted: 2, riders: [{ riderId: "r1", displayName: "Priya", riddenMonth: "2026-09-01", bike: "Himalayan", note: "Slippery after rain" }] })} />);
    expect(screen.getByText(/3 riders say/)).toBeInTheDocument();
    expect(screen.getByText(/latest Sep 2026/)).toBeInTheDocument();
    expect(screen.getByText("Priya")).toBeInTheDocument();
    expect(screen.getByText("Himalayan · Sep 2026")).toBeInTheDocument();
    expect(screen.getByText(/2 more riders who keep their profile private/)).toBeInTheDocument();
    expect(screen.getByText(/self-reported/i)).toBeInTheDocument();
  });

  it("gives a signed-in rider a form with optional month, bike and note, limited to the current month", () => {
    const { container } = render(<RiddenPanel {...base} signedIn summary={summary()} />);
    expect(container.querySelector("input[name=slug]")).toHaveAttribute("value", "ridge");
    expect(container.querySelector("input[name=month]")).toHaveAttribute("max", "2026-10");
    expect(screen.getByLabelText(/Which bike/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add me to the list" })).toBeInTheDocument();
  });

  it("shows a rider who has ridden here a way to remove themselves", () => {
    render(<RiddenPanel {...base} signedIn summary={summary({ count: 1, mine: { riddenMonth: "2026-09-01", bike: null, note: null } })} />);
    expect(screen.getByText(/You have ridden here \(Sep 2026\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove me from the list/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add me to the list" })).toBeNull();
  });

  it("shows the result of the last action", () => {
    render(<RiddenPanel {...base} signedIn summary={summary()} code="ridden_invalid" />);
    expect(screen.getByRole("status")).toHaveTextContent(/check the month/i);
  });

  it("offers a question form on public riders to signed-in members, but not on yourself or to signed-out visitors", () => {
    const riders = [{ riderId: "r-other", displayName: "Priya", riddenMonth: null, bike: null, note: null }, { riderId: "r-me", displayName: "Me", riddenMonth: null, bike: null, note: null }];
    const { container, rerender } = render(<RiddenPanel {...base} signedIn ownRiderId="r-me" summary={summary({ count: 2, riders })} actions={{ ...actions, ask: vi.fn() }} />);
    expect(screen.getByText("Ask Priya a question")).toBeInTheDocument();
    expect(screen.queryByText("Ask Me a question")).toBeNull();
    expect(container.querySelector("input[name=riderId]")).toHaveAttribute("value", "r-other");
    rerender(<RiddenPanel {...base} signedIn={false} summary={summary({ count: 2, riders })} actions={{ ...actions, ask: vi.fn() }} />);
    expect(screen.queryByText("Ask Priya a question")).toBeNull();
  });
});
