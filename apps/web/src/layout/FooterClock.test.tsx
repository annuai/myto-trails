import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FooterClock } from "./FooterClock";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("FooterClock", () => {
  it("shows India time and the daytime badge, and keeps ticking", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 24, 6, 0, 0))); // 11:30:00 am IST
    render(<FooterClock place="Delhi, India" timeZone="Asia/Kolkata" />);
    expect(screen.getByText("Delhi, India")).toBeInTheDocument();
    expect(screen.getByLabelText(/Local time in Delhi, India 11:30:00 am/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Time for the next ride");
    expect(screen.getByRole("status")).not.toHaveTextContent(/careful/i);
    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByLabelText(/11:30:02 am/)).toBeInTheDocument();
  });
  it("adds the night warning after dark", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 24, 15, 0, 0))); // 8:30 pm IST
    render(<FooterClock timeZone="Asia/Kolkata" />);
    expect(screen.getByRole("status")).toHaveTextContent(/Be careful in the night as well/);
  });
  it("labels the zone and, without a place from the server, names the place from the time zone", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 24, 6, 0, 0)));
    render(<FooterClock timeZone="Asia/Kolkata" />);
    expect(screen.getByText("IST · UTC +5:30")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
  });
  it("shows the visitor's own time when they are elsewhere", () => {
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 24, 14, 0, 0)));
    render(<FooterClock place="Dubai, United Arab Emirates" timeZone="Asia/Dubai" />);
    expect(screen.getByLabelText(/06:00:00 pm/)).toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveTextContent(/careful/i); // 6 pm in Dubai is still day
  });
});
