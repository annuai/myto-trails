// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const tags = vi.hoisted(() => [] as string[]);
const role = vi.hoisted(() => ({ value: "admin" as "admin" | "moderator" | null }));
vi.mock("next/cache", () => ({ updateTag: (t: string) => void tags.push(t) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));
vi.mock("@/server/moderation/session", () => ({
  requireAdmin: async () => {
    if (role.value !== "admin") throw new Error("notFound");
    return { id: "a1", role: "admin" };
  },
  requireModerator: async () => ({ id: "m1", role: role.value }),
}));
vi.mock("@/server/auth/session", () => ({ getCurrentUser: async () => ({ id: "a1" }), getEmailSender: () => ({}) }));
vi.mock("@/server/db/client", () => ({ getSql: () => ({}) }));

import { refreshSiteCacheAction } from "./actions";

beforeEach(() => {
  tags.length = 0;
  role.value = "admin";
});

describe("refreshSiteCacheAction", () => {
  it("clears the trail, region and listing caches for an admin, then returns to the moderation page", async () => {
    await expect(refreshSiteCacheAction()).rejects.toThrow("redirect:/moderate?refreshed=1");
    expect(tags).toContain("trails");
  });

  it("does nothing for a moderator who is not an admin", async () => {
    role.value = "moderator";
    await expect(refreshSiteCacheAction()).rejects.toThrow("notFound");
    expect(tags).toEqual([]);
  });
});
