import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrailDetail } from "./TrailDetail";
import { makeTrail } from "./test-trail";

describe("TrailDetail", () => {
  it("has exactly one h1 with the trail name and the breadcrumb trail above it", () => {
    render(<TrailDetail trail={makeTrail()} media={[]} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sample Wayanad ridge track");
    expect(screen.getByRole("link", { name: "Kerala" })).toHaveAttribute("href", "/regions/india/kerala");
    expect(screen.getByRole("link", { name: "Wayanad" })).toHaveAttribute("href", "/regions/india/kerala/wayanad");
  });

  it("puts the at-a-glance strip before the summary", () => {
    const { container } = render(<TrailDetail trail={makeTrail()} media={[]} />);
    const text = container.textContent ?? "";
    expect(text.indexOf("Access")).toBeLessThan(text.indexOf("A fictional gravel ridge track"));
  });

  it("links the state only when the trail has no district", () => {
    render(<TrailDetail trail={makeTrail({ district: null })} media={[]} />);
    expect(screen.getByRole("link", { name: "Kerala" })).toHaveAttribute("href", "/regions/india/kerala");
    expect(screen.queryByRole("link", { name: "Wayanad" })).toBeNull();
  });

  it("shows the revision note and contributor", () => {
    render(<TrailDetail trail={makeTrail({ version: 3 })} media={[]} />);
    expect(screen.getByText(/Version 3/)).toBeInTheDocument();
    expect(screen.getByText(/Sample data \(fictional\)/)).toBeInTheDocument();
  });

  it("never offers a GPX download", () => {
    render(<TrailDetail trail={makeTrail()} media={[]} />);
    expect(screen.queryByText(/gpx/i)).toBeNull();
  });

  it("lists terrain and suitability as text", () => {
    render(<TrailDetail trail={makeTrail()} media={[]} />);
    expect(screen.getByText("Gravel")).toBeInTheDocument();
    expect(screen.getByText("Forest track")).toBeInTheDocument();
    expect(screen.getByText("Adventure tourer")).toBeInTheDocument();
  });
});
