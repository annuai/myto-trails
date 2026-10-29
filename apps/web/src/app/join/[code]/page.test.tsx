// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => undefined }));
// The page must never touch the database: any attempt fails the test.
vi.mock("@/server/db/client", () => ({ getSql: () => { throw new Error("the invite page must not look anything up"); } }));

import JoinPage, { metadata } from "./page";

const render = async (code: string) => renderToStaticMarkup(await JoinPage({ params: Promise.resolve({ code }) } as never));

describe("the group ride invite page", () => {
  it("shows the code, a button into the app, and what to do without it", async () => {
    const html = await render("ABC234");
    expect(html).toContain("Join a group ride on Myto Moto");
    expect(html).toContain(">ABC234<");
    expect(html).toContain('href="myto://join/ABC234"');
    expect(html).toContain("Open in Myto Moto");
    expect(html).toContain("Open Myto Moto, tap Ride, then Group ride, then type the code");
  });
  it("accepts the code in any case and tidies it", async () => {
    expect(await render("abc234")).toContain('href="myto://join/ABC234"');
    expect(await render("abc%20234")).toContain('href="myto://join/ABC234"');
  });
  it("says only that the link looks wrong for anything that cannot be a code, with no app link", async () => {
    for (const bad of ["NOPE", "ABC0O1", "ABC2345", "<script>"]) {
      const html = await render(bad);
      expect(html).toContain("does not look right");
      expect(html).not.toContain("myto://");
      expect(html).not.toContain(bad.replace(/[<>]/g, ""));
    }
  });
  it("is kept out of search results and Referer headers", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});
