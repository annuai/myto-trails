import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { violations } from "@/test-utils/axe";
import { DonateContent } from "./legal/DonateContent";
import { LegalPage } from "./legal/LegalPage";
import { StepFields, type StepContext } from "./submit/StepFields";
import { Stepper } from "./submit/Stepper";
import { TrailDetail } from "./trail/TrailDetail";
import { makeTrail } from "./trail/test-trail";
import { AccountMenu } from "./account/AccountMenu";

vi.mock("@/features/map/RouteMap", () => ({ RouteMap: () => <div /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const ctx: StepContext = { states: [{ slug: "kerala", name: "Kerala" }], route: null, duplicates: [], photos: [], maxPhotos: 8, attachRoute: async () => ({ ok: true }) };

describe("accessibility (structure, labels, roles)", () => {
  it.each([1, 2, 3, 4, 5, 6])("submission step %i has no axe violations, with and without errors", async (step) => {
    const clean = render(<form><StepFields step={step} values={{}} errors={{}} ctx={ctx} /></form>);
    expect(await violations(clean.container)).toEqual([]);
    clean.unmount();
    const bad = render(<form><StepFields step={step} values={{}} errors={{ name: "Too short.", summary: "Too short.", state: "Choose.", district: "x", nearestTown: "x", startPoint: "x", routeShape: "x", difficulty: "x", terrain: "x", accessClass: "x", basis: "x", evidence: "x", photos: "x", licenceAccepted: "x" }} ctx={ctx} /></form>);
    expect(await violations(bad.container)).toEqual([]);
  });

  it("stepper, trail page, legal page, donate page and account menu have no axe violations", async () => {
    for (const ui of [
      <Stepper key="s" id="x" current={2} furthest={4} />,
      <TrailDetail key="t" trail={makeTrail({ hasGpx: true })} media={[]} route={{ distanceKm: 10, elevGainM: 100, elevLossM: 90, minElevM: 500, maxElevM: 700, pointCount: 100, profile: [{ d: 0, e: 500 }, { d: 10, e: 700 }], line: [[76, 11], [76.1, 11.1]] }} />,
      <LegalPage key="l" title="Terms" draft><h2>One</h2><p>Text</p></LegalPage>,
      <DonateContent key="d" url="https://pay.example.com" />,
      <nav key="a"><AccountMenu user={{ displayName: "A B", email: "a@b.test" }} /></nav>,
    ]) {
      const r = render(ui);
      expect(await violations(r.container)).toEqual([]);
      r.unmount();
    }
  });
});
