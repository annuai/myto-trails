import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { NearMeButton } from "./NearMeButton";

describe("NearMeButton", () => {
  beforeEach(() => {
    push.mockClear();
    window.history.pushState({}, "", "/trails");
    document.cookie = "mt_near=; max-age=0; path=/trails";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks for the location only after the click", () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    render(<NearMeButton />);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("stores a rounded point in a cookie, keeps coordinates out of the URL and navigates", async () => {
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 12.971599, longitude: 77.594563 } } as GeolocationPosition) },
    });
    render(<NearMeButton />);
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/trails?near=me"));
    expect(document.cookie).toContain("mt_near=12.97%2C77.59");
    expect(push.mock.calls[0]![0]).not.toContain("12.97");
  });

  it("explains a denied permission and offers the place search instead", async () => {
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) => err({ code: 1 } as GeolocationPositionError) },
    });
    render(<NearMeButton />);
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/couldn.t get your location/i);
    expect(push).not.toHaveBeenCalled();
  });

  it("says so when the browser has no geolocation", () => {
    vi.stubGlobal("navigator", {});
    render(<NearMeButton />);
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/isn.t available/i);
  });
  it("has a compact inline variant for the hero search row", () => {
    render(<NearMeButton variant="inline" />);
    expect(screen.getByRole("button", { name: "Trails near me" })).toBeInTheDocument();
  });
});
