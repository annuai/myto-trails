export const REPORT_TYPES = ["closure", "wrong_access", "wrong_location", "unsafe_info", "duplicate", "inaccurate_gpx", "environmental", "other"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** Environmental and safety concerns go to the front of the moderation queue. */
export function reportPriority(type: ReportType): "normal" | "high" {
  return type === "environmental" || type === "unsafe_info" ? "high" : "normal";
}

const MIN_DETAILS = 20;
const MAX_DETAILS = 2000;

export type ReportValidation =
  | { ok: true; value: { type: ReportType; details: string } }
  | { ok: false; errors: { type?: string; details?: string } };

export function validateReport(input: { type?: unknown; details?: unknown }): ReportValidation {
  const errors: { type?: string; details?: string } = {};
  const type = typeof input.type === "string" && (REPORT_TYPES as readonly string[]).includes(input.type) ? (input.type as ReportType) : undefined;
  if (!type) errors.type = "Choose what kind of problem this is.";

  // Control characters (except tab and newline) are dropped before counting.
  // eslint-disable-next-line no-control-regex
  const details = typeof input.details === "string" ? input.details.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim() : "";
  if (details.length < MIN_DETAILS) errors.details = `Describe the problem in at least ${MIN_DETAILS} characters.`;
  else if (details.length > MAX_DETAILS) errors.details = "Keep it under 2,000 characters.";

  return type && !errors.details ? { ok: true, value: { type, details } } : { ok: false, errors };
}
