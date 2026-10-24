import type { AccessClass, OperationalStatus, VerificationLevel } from "@moto-trails/domain";

export type Tone = "good" | "caution" | "stop" | "unknown";
export type Glyph = "circle" | "triangle" | "square" | "diamond" | "open-circle" | "check";
export type Status = { label: string; tone: Tone; glyph: Glyph };

const access: Record<AccessClass, Status> = {
  public: { label: "Publicly accessible", tone: "good", glyph: "circle" },
  permission_required: { label: "Permission required", tone: "caution", glyph: "triangle" },
  private_no_access: { label: "Private – no public access", tone: "stop", glyph: "square" },
  restricted: { label: "Restricted access", tone: "stop", glyph: "square" },
  unknown: { label: "Access unknown", tone: "unknown", glyph: "open-circle" },
};

const condition: Record<OperationalStatus, Status> = {
  open: { label: "Open", tone: "good", glyph: "circle" },
  seasonal: { label: "Seasonal access", tone: "caution", glyph: "diamond" },
  temporarily_closed: { label: "Temporarily closed", tone: "stop", glyph: "square" },
  permanently_closed: { label: "Permanently closed", tone: "stop", glyph: "square" },
  unknown: { label: "Condition unknown", tone: "unknown", glyph: "open-circle" },
};

const verification: Record<VerificationLevel, Status> = {
  officially_verified: { label: "Officially verified", tone: "good", glyph: "check" },
  moderator_verified: { label: "Moderator verified", tone: "good", glyph: "check" },
  community_reported: { label: "Community reported", tone: "caution", glyph: "triangle" },
  unverified: { label: "Unverified", tone: "unknown", glyph: "open-circle" },
};

export function statusFor(kind: "access", value: AccessClass): Status;
export function statusFor(kind: "condition", value: OperationalStatus): Status;
export function statusFor(kind: "verification", value: VerificationLevel): Status;
export function statusFor(kind: "access" | "condition" | "verification", value: string): Status {
  const table: Record<string, Record<string, Status>> = { access, condition, verification };
  const status = table[kind]?.[value];
  if (!status) throw new Error(`Unknown ${kind} value: ${value}`);
  return status;
}
