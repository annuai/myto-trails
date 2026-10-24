import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => {
  throw new Error("WebGL is not available");
});
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

import { TrailMap } from "./TrailMap";

const points = [{ slug: "a", name: "A trail", place: "Kerala", lon: 76.1, lat: 11.6, accessClass: "public" as const }];

describe("TrailMap", () => {
  it("is a labelled region and points riders to the list", () => {
    render(<TrailMap points={points} />);
    expect(screen.getByRole("region", { name: "Map of trails" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip the map and go to the list" })).toHaveAttribute("href", "#results");
  });

  it("falls back to a clear message when the map cannot load", async () => {
    render(<TrailMap points={points} />);
    expect(await screen.findByText(/The map couldn.t load/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Loading map…")).toBeNull());
  });

  it("says when there is nothing to show", () => {
    render(<TrailMap points={[]} />);
    expect(screen.getByText("No trails with a public location match these filters.")).toBeInTheDocument();
  });
});
