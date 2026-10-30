import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["98123 45678", "+919812345678"],
    ["+91-98123-45678", "+919812345678"],
    ["919812345678", "+919812345678"],
    ["09812345678", "+919812345678"],
  ])("reads %s as an Indian number", (raw, out) => expect(normalizePhone(raw)).toBe(out));

  it("reads numbers without + in the given home country", () => {
    expect(normalizePhone("(415) 555-2671", "US")).toBe("+14155552671");
    expect(normalizePhone("07911 123456", "GB")).toBe("+447911123456");
  });
  it("lets a leading + win over the home country", () => {
    expect(normalizePhone("+919812345678", "US")).toBe("+919812345678");
  });
  it.each([["12345"], ["abcdefghij"], ["0000000000"], ["+0123456789"], [""]])("rejects %j", (raw) => expect(normalizePhone(raw)).toBeNull());
});
