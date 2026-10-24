import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ path: "/trails", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { NavProgress } from "./NavProgress";

const bar = () => screen.getByTestId("nav-progress");

beforeEach(() => {
  nav.path = "/trails";
  nav.search = "";
  window.history.pushState({}, "", "/trails");
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

function link(href: string, attrs: Record<string, string> = {}) {
  const a = document.createElement("a");
  a.href = href;
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  a.textContent = "go";
  document.body.appendChild(a);
  return a;
}

describe("NavProgress", () => {
  it("is idle until a link to another page is clicked, then loading", () => {
    render(<NavProgress />);
    expect(bar()).toHaveAttribute("data-state", "idle");
    fireEvent.click(link("/club"), { button: 0 });
    expect(bar()).toHaveAttribute("data-state", "loading");
  });

  it("finishes when the page or query changes", () => {
    const { rerender } = render(<NavProgress />);
    fireEvent.click(link("/club"), { button: 0 });
    nav.path = "/club";
    rerender(<NavProgress />);
    expect(bar()).toHaveAttribute("data-state", "done");
    act(() => void vi.advanceTimersByTime(1000));
    expect(bar()).toHaveAttribute("data-state", "idle");
  });

  it("ignores external links, new-tab links, downloads, same-page and hash links, modified clicks and right clicks", () => {
    render(<NavProgress />);
    for (const a of [
      link("https://example.com/x"),
      link("/club", { target: "_blank" }),
      link("/file.gpx", { download: "" }),
      link("/trails"),
      link("/trails#riders"),
    ]) {
      fireEvent.click(a, { button: 0 });
      expect(bar()).toHaveAttribute("data-state", "idle");
    }
    fireEvent.click(link("/club"), { button: 0, ctrlKey: true });
    fireEvent.click(link("/club"), { button: 0, metaKey: true });
    fireEvent.click(link("/club"), { button: 2 });
    expect(bar()).toHaveAttribute("data-state", "idle");
  });

  it("gives up after a while so it can never hang", () => {
    render(<NavProgress />);
    fireEvent.click(link("/club"), { button: 0 });
    act(() => void vi.advanceTimersByTime(20_000));
    expect(bar()).not.toHaveAttribute("data-state", "loading");
  });

  it("is hidden from assistive technology", () => {
    render(<NavProgress />);
    expect(bar()).toHaveAttribute("aria-hidden", "true");
  });
});
