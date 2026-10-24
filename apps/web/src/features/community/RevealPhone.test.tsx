import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RevealPhone } from "./RevealPhone";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("RevealPhone", () => {
  it("explains the limits before anything is shown, and does not contain the number", () => {
    const { container } = render(<RevealPhone questionId="q1" otherName="Rhea" action={vi.fn(async () => ({}))} />);
    expect(screen.getByText(/for 5 minutes/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d{10}/);
  });

  it("shows the number with a countdown, lets it be copied and saved as a contact, then deletes it from the page when time is up", async () => {
    const action = vi.fn(async () => ({ phone: "+919812345678", remainingSeconds: 3 }));
    render(<RevealPhone questionId="q1" otherName="Rhea" action={action} />);
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Reveal the number" })));
    expect(screen.getByTestId("revealed-phone")).toHaveTextContent("+919812345678");
    expect(screen.getByText(/Time left 0:0[23]/)).toBeInTheDocument();
    const save = screen.getByRole("link", { name: "Save to contacts" });
    expect(save.getAttribute("href")).toContain("text/vcard");
    expect(decodeURIComponent(save.getAttribute("href")!)).toContain("TEL;TYPE=CELL:+919812345678");
    expect(save).toHaveAttribute("download", "Rhea.vcf");
    act(() => void vi.advanceTimersByTime(4000));
    expect(screen.queryByTestId("revealed-phone")).toBeNull();
    expect(screen.getByText(/the number has been deleted/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal the number" })).toBeNull();
  });

  it("shows a clear message when the number is no longer available", async () => {
    render(<RevealPhone questionId="q1" otherName="Rhea" action={vi.fn(async () => ({ error: "This number is no longer available." }))} />);
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Reveal the number" })));
    expect(screen.getByRole("alert")).toHaveTextContent(/no longer available/);
  });
});
