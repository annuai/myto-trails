import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BikeModel } from "@moto-trails/domain";
import { BikeFields } from "./BikeFields";
import { BikeImage } from "./BikeImage";
import { BikePicker } from "./BikePicker";

const model = (n: number): BikeModel => ({ id: `id-${n}`, slug: `royal-enfield-${n}`, make: "Royal Enfield", makeSlug: "royal-enfield", model: `Classic ${n}`, variant: null, category: "retro", engineCc: 350, yearFrom: 2020, yearTo: null, image: { "400": `https://cdn.test/${n}-400.webp` } });
function fakeApi(items: BikeModel[]) {
  const fetchMock = vi.fn(async (url: string) =>
    new Response(JSON.stringify(url.includes("/makes") ? { items: [{ slug: "royal-enfield", name: "Royal Enfield", models: items.length }] } : { items, page: 1, pageSize: 48, total: items.length }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
afterEach(() => vi.unstubAllGlobals());

describe("BikeImage", () => {
  it("shows the rider's own photo over the catalogue picture, and a placeholder when there is neither", () => {
    const { rerender } = render(<BikeImage own="own.jpg" preset={{ "400": "cat.webp" }} want={400} alt="Scram" />);
    expect(screen.getByRole("img", { name: "Scram" })).toHaveAttribute("src", "own.jpg");
    rerender(<BikeImage preset={{ "400": "cat.webp" }} want={400} alt="Scram" />);
    expect(screen.getByRole("img", { name: "Scram" })).toHaveAttribute("src", "cat.webp");
    rerender(<BikeImage want={400} alt="Scram" />);
    expect(screen.getByRole("img", { name: "Scram, no picture yet" })).toBeInTheDocument();
  });
});

describe("BikePicker", () => {
  it("lists the catalogue as cards and reports the chosen model", async () => {
    const fetchMock = fakeApi([model(1), model(2)]);
    const onPick = vi.fn();
    render(<BikePicker onPick={onPick} />);
    fireEvent.click(await screen.findByRole("button", { name: /Classic 2/ }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "id-2" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/bikes?", expect.anything());
  });

  it("filters by make and type through the query string", async () => {
    const fetchMock = fakeApi([model(1)]);
    render(<BikePicker onPick={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Royal Enfield" }));
    fireEvent.click(screen.getByRole("button", { name: "Retro" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/bikes?make=royal-enfield&category=retro", expect.anything()));
  });

  it("says so when nothing matches", async () => {
    fakeApi([]);
    render(<BikePicker onPick={vi.fn()} />);
    expect(await screen.findByText(/No bikes match/)).toBeInTheDocument();
  });
});

describe("BikeFields", () => {
  it("pre-fills the name from the chosen bike and sends its id with the form", async () => {
    fakeApi([model(7)]);
    const { container } = render(<BikeFields bike={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose a bike" }));
    fireEvent.click(await screen.findByRole("button", { name: /Classic 7/ }));
    expect(screen.getByLabelText("Bike name")).toHaveValue("Royal Enfield Classic 7");
    expect(container.querySelector('input[name="bikeModelId"]')).toHaveValue("id-7");
  });
});
