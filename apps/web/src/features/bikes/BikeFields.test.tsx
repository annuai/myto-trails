import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BikeModel } from "@moto-trails/domain";
import { BikeFields } from "./BikeFields";
import { BikeImage } from "./BikeImage";

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

describe("BikeFields", () => {
  it("offers every model of the chosen make, names the bike from it and sends its id", async () => {
    const fetchMock = fakeApi([model(6), model(7)]);
    const { container } = render(<BikeFields bike={null} />);
    fireEvent.change(await screen.findByLabelText("Make"), { target: { value: "royal-enfield" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/bikes?all=1&make=royal-enfield", expect.anything()));
    fireEvent.change(await screen.findByLabelText("Model"), { target: { value: "id-7" } });
    expect(container.querySelector('input[name="name"]')).toHaveValue("Royal Enfield Classic 7");
    expect(container.querySelector('input[name="bikeModelId"]')).toHaveValue("id-7");
  });

  it("limits the year to the model's production years", async () => {
    fakeApi([model(7)]);
    render(<BikeFields bike={null} />);
    fireEvent.change(await screen.findByLabelText("Make"), { target: { value: "royal-enfield" } });
    fireEvent.change(await screen.findByLabelText("Model"), { target: { value: "id-7" } });
    const years = within(screen.getByLabelText(/Model year/)).getAllByRole("option").map((o) => o.textContent);
    expect(years[0]).toBe("Not set");
    expect(years.at(-1)).toBe("2020");
    expect(years).not.toContain("2019");
  });

  it("types the name only for a bike that is not in the catalogue", async () => {
    fakeApi([model(7)]);
    const { container } = render(<BikeFields bike={null} />);
    fireEvent.change(await screen.findByLabelText("Make"), { target: { value: "__other" } });
    fireEvent.change(screen.getByLabelText("Bike name"), { target: { value: "My café racer" } });
    expect(container.querySelector('input[name="name"]')).toHaveValue("My café racer");
    expect(container.querySelector('input[name="bikeModelId"]')).toHaveValue("none");
  });

  it("keeps the saved bike until the rider asks to change it", () => {
    const saved = { name: "Scram 411", modelYear: 2022, photoUrl: null, ownPhoto: false, bikeModelId: "id-1" };
    const { container } = render(<BikeFields bike={saved} />);
    expect(container.querySelector('input[name="name"]')).toHaveValue("Scram 411");
    expect(container.querySelector('input[name="bikeModelId"]')).toBeNull();
    expect(screen.getByLabelText(/Model year/)).toHaveValue("2022");
    expect(screen.getByRole("button", { name: "Change bike" })).toBeInTheDocument();
  });
});
