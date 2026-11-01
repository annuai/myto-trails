import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WomenSafe } from "./WomenSafe";

const actions = { mark: vi.fn(), unmark: vi.fn() };
const view = (summary: { count: number; confirmed: boolean; mine: boolean; canMark: boolean }, code?: string) => render(<WomenSafe slug="ridge" summary={summary} code={code} actions={actions} />);

describe("WomenSafe", () => {
  it("shows nothing with no marks to a viewer who cannot mark", () => {
    const { container } = view({ count: 0, confirmed: false, mine: false, canMark: false });
    expect(container).toBeEmptyDOMElement();
  });
  it("offers only the button when nobody has marked yet and the viewer can", () => {
    view({ count: 0, confirmed: false, mine: false, canMark: true });
    expect(screen.queryByText(/Reported safe/)).toBeNull();
    expect(screen.getByRole("button", { name: "+ Mark as safe for women riders" })).toBeInTheDocument();
    expect(screen.getByText("Nobody can see who marked a trail.")).toBeInTheDocument();
  });
  it("reports one or two riders as unconfirmed, with singular and plural", () => {
    const { unmount } = view({ count: 1, confirmed: false, mine: false, canMark: false });
    expect(screen.getByText("Reported safe by 1 women rider")).toBeInTheDocument();
    unmount();
    view({ count: 2, confirmed: false, mine: false, canMark: false });
    expect(screen.getByText("Reported safe by 2 women riders")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("confirms the trail from three riders", () => {
    view({ count: 3, confirmed: true, mine: false, canMark: false });
    expect(screen.getByText("Safe for women riders")).toBeInTheDocument();
  });
  it("lets the rider remove her mark", () => {
    view({ count: 3, confirmed: true, mine: true, canMark: true });
    expect(screen.getByRole("button", { name: "Remove my mark" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark as safe/ })).toBeNull();
  });
  it("shows the result of the last action", () => {
    view({ count: 1, confirmed: false, mine: true, canMark: true }, "women_safe");
    expect(screen.getByRole("status")).toHaveTextContent("Your mark is added");
  });
});
