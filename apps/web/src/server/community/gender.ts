/** A rider's private gender. null is "prefer not to say". Only women-only clubs read it, through `is_woman`. */
export type Gender = "male" | "female" | "other";

/** The form value for "prefer not to say". */
export const GENDER_NONE = "none";

/** Parses a form or API value: a gender, null for none/empty/missing, or "invalid" for anything else. */
export function parseGender(v: unknown): Gender | null | "invalid" {
  if (v === undefined || v === null || v === "" || v === GENDER_NONE) return null;
  return v === "male" || v === "female" || v === "other" ? v : "invalid";
}

/** `app_user.is_woman` is always this of `app_user.gender`. */
export const isWomanOf = (g: Gender | null): boolean => g === "female";
