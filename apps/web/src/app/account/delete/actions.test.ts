// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }));
const cookieDelete = vi.hoisted(() => vi.fn());
const getCurrentUser = vi.hoisted(() => vi.fn());
const deleteAccount = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: cookieDelete }) }));
vi.mock("@/server/auth/session", () => ({ getCurrentUser }));
vi.mock("@/server/db/client", () => ({ getSql: () => ({}) }));
vi.mock("@/server/storage", () => ({ getStorage: () => ({}) }));
vi.mock("@/server/account/delete", async () => ({ ...(await vi.importActual<typeof import("@/server/account/delete")>("@/server/account/delete")), deleteAccount }));

import { deleteAccountAction } from "./actions";

const form = (confirm?: string) => { const f = new FormData(); if (confirm !== undefined) f.set("confirm", confirm); return f; };
const run = (f: FormData) => deleteAccountAction(f).then(() => "no redirect", (e: Error) => e.message);

describe("deleteAccountAction", () => {
  beforeEach(() => {
    redirect.mockClear(); cookieDelete.mockClear(); deleteAccount.mockReset();
    getCurrentUser.mockResolvedValue({ id: "user-1" });
  });

  it("sends a signed-out visitor to sign in", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await run(form("delete"))).toBe("REDIRECT /sign-in?next=%2Faccount%2Fdelete");
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("does nothing without the typed word", async () => {
    expect(await run(form("nope"))).toBe("REDIRECT /account/delete?error=confirm");
    expect(await run(form())).toBe("REDIRECT /account/delete?error=confirm");
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("explains, and keeps the account and the session, when the rider runs a club alone", async () => {
    deleteAccount.mockResolvedValue({ ok: false, reason: "club_admin", clubs: ["Trail Club 1"] });
    expect(await run(form("delete"))).toBe("REDIRECT /account/delete?error=club");
    expect(cookieDelete).not.toHaveBeenCalled();
  });

  it("deletes the account, signs the browser out and says goodbye", async () => {
    deleteAccount.mockResolvedValue({ ok: true });
    expect(await run(form(" Delete "))).toBe("REDIRECT /account/deleted");
    expect(deleteAccount).toHaveBeenCalledWith({}, {}, "user-1");
    expect(cookieDelete).toHaveBeenCalledWith("mt_session");
  });
});
