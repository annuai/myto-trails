import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiderReports } from "./RiderReports";

const NOW = new Date("2026-10-30T12:00:00Z");
const r = (over: Partial<Parameters<typeof RiderReports>[0]["reports"][number]> = {}) => ({ id: "1", kind: "muddy" as const, at: "2026-10-29T12:00:00Z", confirmations: 0, disputes: 0, fresh: true, ...over });

describe("RiderReports", () => {
  it("renders nothing when there are no recent reports", () => {
    const { container } = render(<RiderReports reports={[]} now={NOW} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("labels them as rider reports that moderators have not checked, with how old each is", () => {
    render(<RiderReports reports={[r(), r({ id: "2", kind: "blocked", at: "2026-10-01T12:00:00Z", fresh: false })]} now={NOW} />);
    expect(screen.getByText(/Reported by riders/)).toBeInTheDocument();
    expect(screen.getByText(/not checked by moderators/i)).toBeInTheDocument();
    expect(screen.getByText("Muddy")).toBeInTheDocument();
    expect(screen.getByText("1 day ago")).toBeInTheDocument();
    expect(screen.getByText("29 days ago")).toBeInTheDocument();
    expect(screen.getByText("Older report")).toBeInTheDocument();
  });
  it("shows how many riders said it was still true", () => {
    render(<RiderReports reports={[r({ confirmations: 3, disputes: 1 })]} now={NOW} />);
    expect(screen.getByText("3 riders say it is still true, 1 says it is not")).toBeInTheDocument();
  });
  it("does not use words that read as confirmed or official", () => {
    const { container } = render(<RiderReports reports={[r()]} now={NOW} />);
    expect(container.textContent).not.toMatch(/verified|confirmed by|official/i);
  });
});
