// Who may download a trail's GPX track.

import type { AccessClass, Lifecycle, OperationalStatus, Sensitivity } from "./enums";

/** Allowed, or refused with the reason, so the page can say why. */
export type GpxDecision =
  | { allowed: true }
  | { allowed: false; reason: "not_published" | "no_gpx" | "sensitive_area" | "access_not_allowed" | "permanently_closed" };

/**
 * A GPX is offered only for a published trail that has a file, a standard-sensitivity location, public or by-permission access, and is not
 * permanently closed.
 */
export function canDownloadGpx(t: {
  lifecycle: Lifecycle;
  accessClass: AccessClass;
  sensitivity: Sensitivity;
  hasGpx: boolean;
  condition: OperationalStatus;
}): GpxDecision {
  if (t.lifecycle !== "published") return { allowed: false, reason: "not_published" };
  if (!t.hasGpx) return { allowed: false, reason: "no_gpx" };
  if (t.sensitivity !== "standard") return { allowed: false, reason: "sensitive_area" };
  if (t.accessClass !== "public" && t.accessClass !== "permission_required") return { allowed: false, reason: "access_not_allowed" };
  if (t.condition === "permanently_closed") return { allowed: false, reason: "permanently_closed" };
  return { allowed: true };
}
