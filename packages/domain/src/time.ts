const DAY_MS = 86_400_000;

/** End instant of an ISO date (end of that UTC day) or the instant of an ISO timestamp. */
export function endOfValidity(value: string): number {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) + DAY_MS - 1 : Date.parse(value);
}

export { DAY_MS };
