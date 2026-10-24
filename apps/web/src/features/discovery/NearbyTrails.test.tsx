import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeTrail } from "../trail/test-trail";
import { NearbyTrails } from "./NearbyTrails";

const item = (o = {}) => ({ ...makeTrail(), lon: 76.1, lat: 11.6, distanceFromKm: 42.4, travel: { oneWayMin: 65, roundTripMin: 130 }, ...o });
const geo = (impl: (ok: PositionCallback, err: PositionErrorCallback) => void) => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: impl } });
  Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: async () => ({ state: "prompt" }) } });
};
const here: PositionCallback = (cb) => void cb;
void here;

afterEach(() => vi.unstubAllGlobals());

describe("NearbyTrails", () => {
  it("asks first, then shows cards with the distance written below each", async () => {
    geo((ok) => ok({ coords: { latitude: 12.9716, longitude: 77.5946 } } as GeolocationPosition));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ items: [item()] })));
    vi.stubGlobal("fetch", fetchMock);
    render(<NearbyTrails />);
    expect(screen.queryByText(/km away/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /show trails near me/i }));
    expect(await screen.findByText(/42 km away/)).toBeInTheDocument();
    expect(screen.getByText(/≈ 1 h 5 min each way/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sample Wayanad ridge track" })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/nearby");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ lat: 12.9716, lon: 77.5946 }); // sent in the body, never in a URL
  });

  it("explains a refusal and offers a way to browse instead", async () => {
    geo((_ok, err) => err({ code: 1, message: "denied", PERMISSION_DENIED: 1 } as GeolocationPositionError));
    render(<NearbyTrails />);
    await userEvent.click(screen.getByRole("button", { name: /show trails near me/i }));
    expect(await screen.findByText(/location is off/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse by region/i })).toHaveAttribute("href", "/regions");
  });

  it("says so when nothing is near, or when the visitor is outside India", async () => {
    geo((ok) => ok({ coords: { latitude: 12.9, longitude: 77.5 } } as GeolocationPosition));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ items: [] }))));
    const { unmount } = render(<NearbyTrails />);
    await userEvent.click(screen.getByRole("button", { name: /show trails near me/i }));
    expect(await screen.findByText(/no trails within 300 km yet/i)).toBeInTheDocument();
    unmount();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "outside" }))));
    render(<NearbyTrails />);
    await userEvent.click(screen.getByRole("button", { name: /show trails near me/i }));
    expect(await screen.findByText(/only list trails in india/i)).toBeInTheDocument();
  });

  it("recovers from a network failure", async () => {
    geo((ok) => ok({ coords: { latitude: 12.9, longitude: 77.5 } } as GeolocationPosition));
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    render(<NearbyTrails />);
    await userEvent.click(screen.getByRole("button", { name: /show trails near me/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i));
  });
});
