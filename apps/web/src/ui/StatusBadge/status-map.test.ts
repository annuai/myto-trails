import { describe, expect, it } from "vitest";
import { statusFor } from "./status-map";

const cases = [
  ["access", "public", "Publicly accessible", "good", "circle"],
  ["access", "permission_required", "Permission required", "caution", "triangle"],
  ["access", "private_no_access", "Private – no public access", "stop", "square"],
  ["access", "restricted", "Restricted access", "stop", "square"],
  ["access", "unknown", "Access unknown", "unknown", "open-circle"],
  ["condition", "open", "Open", "good", "circle"],
  ["condition", "seasonal", "Seasonal access", "caution", "diamond"],
  ["condition", "temporarily_closed", "Temporarily closed", "stop", "square"],
  ["condition", "permanently_closed", "Permanently closed", "stop", "square"],
  ["condition", "unknown", "Condition unknown", "unknown", "open-circle"],
  ["verification", "officially_verified", "Officially verified", "good", "check"],
  ["verification", "moderator_verified", "Moderator verified", "good", "check"],
  ["verification", "community_reported", "Community reported", "caution", "triangle"],
  ["verification", "unverified", "Unverified", "unknown", "open-circle"],
] as const;

describe("statusFor", () => {
  it.each(cases)("%s/%s -> %s (%s, %s)", (kind, value, label, tone, glyph) => {
    expect(statusFor(kind as "access", value as never)).toEqual({ label, tone, glyph });
  });
});
