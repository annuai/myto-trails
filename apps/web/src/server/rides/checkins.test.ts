// @vitest-environment node
import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";
import { generateToken, hashToken } from "../auth/tokens";
import { checkinStatus, overdueEmail, parseExpectedAt, parseNewCheckin, parsePosition, sweepCheckins, viewCheckin } from "./checkins";

const now = new Date("2026-11-01T10:00:00Z");
const at = (ms: number) => new Date(now.getTime() + ms);
const H = 3_600_000;

describe("check-in status", () => {
  it("is active before the expected time, overdue after it, arrived once marked safe", () => {
    expect(checkinStatus({ expectedAt: at(H), arrivedAt: null }, now)).toBe("active");
    expect(checkinStatus({ expectedAt: at(-1), arrivedAt: null }, now)).toBe("overdue");
    expect(checkinStatus({ expectedAt: at(-H), arrivedAt: at(-2 * H) }, now)).toBe("arrived");
  });

  it("expires a day after the end, whether the rider arrived or not", () => {
    expect(checkinStatus({ expectedAt: at(-25 * H), arrivedAt: null }, now)).toBe("expired");
    expect(checkinStatus({ expectedAt: at(-30 * H), arrivedAt: at(-25 * H) }, now)).toBe("expired");
    expect(checkinStatus({ expectedAt: at(-23 * H), arrivedAt: null }, now)).toBe("overdue");
  });
});

describe("check-in input", () => {
  it("accepts an arrival time in the future, within a week, and nothing else", () => {
    expect(parseExpectedAt(at(H).toISOString(), now)).toEqual(at(H));
    expect(parseExpectedAt(at(-H).toISOString(), now)).toBeNull();
    expect(parseExpectedAt(at(8 * 24 * H).toISOString(), now)).toBeNull();
    expect(parseExpectedAt("tomorrow", now)).toBeNull();
    expect(parseExpectedAt(undefined, now)).toBeNull();
  });

  const valid = { expectedAt: at(2 * H).toISOString(), contactName: "Meera", contactEmail: "Meera@Example.com", rideName: "Nandi loop", shareLive: true };

  it("parses a full request, lowercasing the email and trimming empty emergency fields", () => {
    const r = parseNewCheckin({ ...valid, position: { lat: 12.9, lng: 77.6, at: now.toISOString() }, emergency: { bloodGroup: "O+", allergies: "", bikeName: "Himalayan" } }, now)!;
    expect(r.contactEmail).toBe("meera@example.com");
    expect(r.shareLive).toBe(true);
    expect(r.emergency).toEqual({ bloodGroup: "O+", bikeName: "Himalayan" });
    expect(r.position).toEqual({ lat: 12.9, lng: 77.6, at: now });
  });

  it("defaults to private, with no email and no emergency card", () => {
    const r = parseNewCheckin({ expectedAt: valid.expectedAt, contactName: "Meera" }, now)!;
    expect(r).toMatchObject({ shareLive: false, contactEmail: null, emergency: null, position: null, rideName: null });
  });

  it.each([
    ["no contact", { ...valid, contactName: "" }],
    ["web address in the name", { ...valid, contactName: "see www.spam.com" }],
    ["bad email", { ...valid, contactEmail: "not-an-email" }],
    ["past time", { ...valid, expectedAt: at(-H).toISOString() }],
    ["position out of range", { ...valid, position: { lat: 120, lng: 0, at: now.toISOString() } }],
    ["emergency that is not an object", { ...valid, emergency: "O+" }],
    ["emergency text too long", { ...valid, emergency: { allergies: "x".repeat(201) } }],
  ])("rejects %s", (_name, body) => {
    expect(parseNewCheckin(body as Record<string, unknown>, now)).toBeNull();
  });

  it("reads a position only when it has numbers in range and a time", () => {
    expect(parsePosition({ lat: 1, lng: 2, at: now.toISOString() })).toEqual({ lat: 1, lng: 2, at: now });
    expect(parsePosition({ lat: "1", lng: 2, at: now.toISOString() })).toBeNull();
    expect(parsePosition({ lat: 1, lng: 2 })).toBeNull();
    expect(parsePosition(null)).toBeNull();
  });
});

/** A database that answers every query with the next prepared result. */
function fakeSql(...results: unknown[][]) {
  const queue = [...results];
  return Object.assign(vi.fn(async () => queue.shift() ?? []), {}) as unknown as Sql & ReturnType<typeof vi.fn>;
}
const row = (over: Record<string, unknown> = {}) => ({
  ride_name: "Nandi loop", share_live: false, expected_at: at(H), arrived_at: null, last_lat: 12.9, last_lng: 77.6, last_ping_at: at(-60_000), battery_pct: 40,
  emergency: { bloodGroup: "O+", riderName: "Asha K" }, wiped_at: null, display_name: "Asha", ...over,
});

describe("what the contact sees", () => {
  const token = generateToken();

  it("finds nothing for a malformed or unknown link, without querying for the former", async () => {
    const sql = fakeSql([]);
    expect(await viewCheckin(sql, "short", now)).toEqual({ found: false });
    expect(sql).not.toHaveBeenCalled();
    expect(await viewCheckin(sql, token, now)).toEqual({ found: false });
  });

  it("keeps the position and the emergency card private while the rider is on time", async () => {
    const v = await viewCheckin(fakeSql([row()]), token, now);
    expect(v).toMatchObject({ found: true, status: "active", riderName: "Asha K", position: null, emergency: null, lastSeenAt: at(-60_000).toISOString() });
  });

  it("shows the position while on time only when the rider chose to share live", async () => {
    const v = await viewCheckin(fakeSql([row({ share_live: true })]), token, now);
    expect(v).toMatchObject({ status: "active", position: { lat: 12.9, lng: 77.6 }, emergency: null });
  });

  it("shows the last position, battery and emergency card once overdue", async () => {
    const v = await viewCheckin(fakeSql([row({ expected_at: at(-H) })]), token, now);
    expect(v).toMatchObject({ status: "overdue", position: { lat: 12.9, lng: 77.6 }, batteryPct: 40, emergency: { bloodGroup: "O+" } });
  });

  it("shows nothing but 'arrived' once the rider is safe, and nothing at all once wiped or expired", async () => {
    expect(await viewCheckin(fakeSql([row({ arrived_at: at(-H), last_lat: null, last_lng: null })]), token, now)).toMatchObject({ status: "arrived", position: null, emergency: null });
    const wiped = await viewCheckin(fakeSql([row({ expected_at: at(-H), wiped_at: now, last_lat: null, last_lng: null })]), token, now);
    expect(wiped).toMatchObject({ status: "expired", position: null, emergency: null, lastSeenAt: null });
  });

  it("looks the link up by its hash, never by the link itself", async () => {
    const sql = fakeSql([]);
    await viewCheckin(sql, token, now);
    const call = (sql as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call.slice(1)).toEqual([hashToken(token)]);
  });
});

describe("the overdue email", () => {
  it("names the rider and the time, points to the link they shared, and carries no position", () => {
    const m = overdueEmail({ riderName: "Asha", rideName: "Nandi loop", expectedAt: new Date("2026-11-01T13:00:00Z") });
    expect(m.subject).toBe("Asha has not arrived");
    expect(m.text).toContain("18:30");
    expect(m.text).toContain("Nandi loop");
    expect(m.text).toContain("112");
    expect(m.text).not.toMatch(/https?:/);
  });

  it("keeps a name with line breaks on one line", () => {
    expect(overdueEmail({ riderName: "A\r\nBcc: x", rideName: null, expectedAt: now }).subject).not.toMatch(/[\r\n]/);
  });
});

describe("the sweep", () => {
  it("emails each overdue contact once and counts the wipes, and survives a failing email", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(undefined);
    const sql = fakeSql(
      [{ id: "c1", contact_email: "a@example.com", ride_name: null, expected_at: at(-H), display_name: "Asha", emergency: null }, { id: "c2", contact_email: "b@example.com", ride_name: "x", expected_at: at(-H), display_name: "Ravi", emergency: { riderName: "Ravi S" } }],
      [], // marking the second one as emailed
      [{ id: "1" }, { id: "2" }, { id: "3" }],
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sweepCheckins(sql, { send }, now)).toEqual({ notified: 1, wiped: 3 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]![0]).toMatchObject({ to: "b@example.com", subject: "Ravi S has not arrived" });
    // The list, one mark for the email that went out (none for the one that failed, so it is tried again), and the wipe.
    expect((sql as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3);
    log.mockRestore();
  });
});
