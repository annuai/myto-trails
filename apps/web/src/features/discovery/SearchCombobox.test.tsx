import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { SearchCombobox } from "./SearchCombobox";

const suggestions = {
  trails: [{ slug: "wayanad-ridge", name: "Wayanad ridge", place: "Wayanad, Kerala" }],
  places: [{ slug: "bengaluru", name: "Bengaluru", state: "Karnataka" }],
  regions: [{ slug: "kerala", name: "Kerala" }],
};

describe("SearchCombobox", () => {
  beforeEach(() => {
    push.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => suggestions })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const type = async (text: string) => {
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: text } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    return input;
  };

  it("follows the URL: a new initialQuery replaces the text", () => {
    const { rerender } = render(<SearchCombobox initialQuery="bangalore" />);
    expect(screen.getByRole("combobox")).toHaveValue("bangalore");
    rerender(<SearchCombobox initialQuery="" />);
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("is a labelled combobox that starts collapsed", () => {
    render(<SearchCombobox />);
    const input = screen.getByRole("combobox", { name: /search/i });
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("shows grouped suggestions after typing", async () => {
    render(<SearchCombobox />);
    const input = await type("ban");
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getByRole("group", { name: "Places" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Trails" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Regions" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Bengaluru/ })).toBeInTheDocument();
  });

  it("does not call the API for text shorter than 2 characters", async () => {
    render(<SearchCombobox />);
    await type("b");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("debounces requests and URL-encodes the text", async () => {
    render(<SearchCombobox />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "ba" } });
    fireEvent.change(input, { target: { value: "ban g" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toBe("/api/suggest?q=ban%20g");
  });

  it("navigates to the chosen suggestion with the keyboard", async () => {
    render(<SearchCombobox />);
    const input = await type("ban");
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));
    fireEvent.keyDown(input, { key: "ArrowDown" }); // first option: the place
    expect(input.getAttribute("aria-activedescendant")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/trails?near=bengaluru");
  });

  it("opens a trail or a region from a click", async () => {
    render(<SearchCombobox />);
    await type("way");
    fireEvent.click(await screen.findByRole("option", { name: /Wayanad ridge/ }));
    expect(push).toHaveBeenCalledWith("/trails/wayanad-ridge");
    push.mockClear();
    await type("ker");
    fireEvent.click(await screen.findByRole("option", { name: "Kerala" }));
    expect(push).toHaveBeenCalledWith("/regions/kerala");
  });

  it("searches the typed text on Enter when nothing is highlighted", async () => {
    render(<SearchCombobox />);
    const input = await type("quokka track");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/trails?q=quokka+track");
  });

  it("closes on Escape", async () => {
    render(<SearchCombobox />);
    const input = await type("ban");
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("survives a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    render(<SearchCombobox />);
    const input = await type("ban");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });
});
