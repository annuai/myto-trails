import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeTrail } from "../trail/test-trail";
import { TrailCard } from "./TrailCard";

describe("TrailCard", () => {
  it("links the trail name to its page", () => {
    render(<TrailCard trail={makeTrail({ name: "Sample ridge" })} />);
    expect(screen.getByRole("link", { name: "Sample ridge" })).toHaveAttribute("href", "/trails/sample-wayanad-ridge-track");
  });
  it("shows access and condition as words and the key facts", () => {
    render(<TrailCard trail={makeTrail({ accessClass: "permission_required", condition: "seasonal" })} />);
    expect(screen.getByText("Permission required")).toBeInTheDocument();
    expect(screen.getByText("Seasonal access")).toBeInTheDocument();
    expect(screen.getByText(/24\.1 km/)).toBeInTheDocument();
    expect(screen.getByText(/Moderate/)).toBeInTheDocument();
    expect(screen.getByText(/Wayanad, Kerala/)).toBeInTheDocument();
  });
  it("shows the verification date, or a re-check note when it has expired", () => {
    const { rerender } = render(<TrailCard trail={makeTrail()} />);
    expect(screen.getByText(/Verified 15 Jan 2026/)).toBeInTheDocument();
    rerender(<TrailCard trail={makeTrail({ verification: { level: "unverified", needsRecheck: true } })} />);
    expect(screen.getByText(/Needs re-check/)).toBeInTheDocument();
  });
  it("marks sample trails", () => {
    const { rerender } = render(<TrailCard trail={makeTrail({ isSample: true })} />);
    expect(screen.getByText("Sample")).toBeInTheDocument();
    rerender(<TrailCard trail={makeTrail({ isSample: false })} />);
    expect(screen.queryByText("Sample")).toBeNull();
  });
  it("shows the cover photo with alt text and a responsive srcset, or a generated placeholder", () => {
    const cover = { variants: { "400": "/p-400.webp", "800": "/p-800.webp" }, altText: "Gravel ridge at dawn", width: 800, height: 500 };
    const { rerender, container } = render(<TrailCard trail={makeTrail({ cover })} />);
    const img = screen.getByAltText("Gravel ridge at dawn");
    expect(img).toHaveAttribute("src", "/p-800.webp");
    expect(img.getAttribute("srcset")).toBe("/p-400.webp 400w, /p-800.webp 800w");
    expect(screen.queryByTestId("placeholder-art")).toBeNull();
    rerender(<TrailCard trail={makeTrail({ cover: null })} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("placeholder-art")).toBeInTheDocument();
  });
  it("shows length, time, difficulty and terrain as badges, skipping figures that are not known", () => {
    const { rerender } = render(<TrailCard trail={makeTrail({ estDurationMin: 150, terrain: ["gravel"] })} />);
    const facts = screen.getByRole("list", { name: "Key facts" });
    expect(facts).toHaveTextContent("24.1 km");
    expect(facts).toHaveTextContent("2 h 30 min");
    expect(facts).toHaveTextContent("Moderate");
    expect(facts).toHaveTextContent("Gravel");
    rerender(<TrailCard trail={makeTrail({ distanceKm: null, estDurationMin: null })} />);
    expect(screen.getByRole("list", { name: "Key facts" })).not.toHaveTextContent("km");
  });
  it("links the photo and the name to the same page, with only the name reachable by keyboard", () => {
    render(<TrailCard trail={makeTrail({ name: "Sample ridge" })} />);
    expect(screen.getAllByRole("link", { hidden: true }).every((l) => l.getAttribute("href") === "/trails/sample-wayanad-ridge-track")).toBe(true);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
