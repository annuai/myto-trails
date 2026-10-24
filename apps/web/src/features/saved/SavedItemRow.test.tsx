import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeTrail } from "../trail/test-trail";
import { SavedItemCard } from "./SavedItemCard";

const remove = vi.fn();

describe("SavedItemCard", () => {
  it("shows the trail and a remove button", () => {
    render(<SavedItemCard item={{ trail: makeTrail({ name: "Ridge" }), addedAt: "2026-05-01T00:00:00.000Z", changes: [] }} remove={remove} />);
    expect(screen.getByRole("link", { name: "Ridge" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Ridge from saved" })).toBeInTheDocument();
    expect(screen.queryByText("Changed")).toBeNull();
  });

  it("explains what changed in words", () => {
    render(
      <SavedItemCard
        item={{
          trail: makeTrail(),
          addedAt: "2026-05-01T00:00:00.000Z",
          changes: [
            { field: "access", from: "public", to: "permission_required" },
            { field: "condition", from: "open", to: "temporarily_closed" },
            { field: "verification", from: "moderator_verified", to: "unverified" },
          ],
        }}
        remove={remove}
      />,
    );
    expect(screen.getByText("Changed")).toBeInTheDocument();
    expect(screen.getByText("Access: Publicly accessible → Permission required")).toBeInTheDocument();
    expect(screen.getByText("Condition: Open → Temporarily closed")).toBeInTheDocument();
    expect(screen.getByText("Verification: Moderator verified → Unverified")).toBeInTheDocument();
  });

  it("shows an unavailable trail without any details and lets it be removed", () => {
    render(<SavedItemCard item={{ trail: null, addedAt: "2026-05-01T00:00:00.000Z", changes: [], unavailableId: "11111111-1111-4111-8111-111111111111" }} remove={remove} />);
    expect(screen.getByText("This trail is no longer published.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove from saved" })).toBeInTheDocument();
  });
});
