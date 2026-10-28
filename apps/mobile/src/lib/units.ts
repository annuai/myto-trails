/** A number and its unit, kept apart so the screen decides how to draw them (see `Measure`). */
export type Quantity = { value: string; unit: string };

/** Narrow no-break space: tight, and the line cannot wrap between the number and its unit. */
export const NARROW_SPACE = ' ';

const grouped = (n: number, maxDecimals: number) => n.toLocaleString('en-IN', { maximumFractionDigits: maxDecimals });

export const distanceKm = (km: number): Quantity => ({ value: grouped(km, 1), unit: 'km' });
export const speedKmh = (kmh: number): Quantity => ({ value: grouped(Math.round(kmh), 0), unit: 'km/h' });
export const elevationM = (m: number): Quantity => ({ value: grouped(Math.round(m), 0), unit: 'm' });

/** Under a minute: "39 sec". Under an hour: "45 min". Otherwise "1 h 5 min". One `Quantity` per part. */
export function durationParts(sec: number): Quantity[] {
  const total = Math.max(0, Math.round(sec));
  if (total < 60) return [{ value: String(total), unit: 'sec' }];
  const h = Math.floor(total / 3600);
  const m = Math.round((total % 3600) / 60);
  return h ? [{ value: String(h), unit: 'h' }, { value: String(m), unit: 'min' }] : [{ value: String(m), unit: 'min' }];
}

/** The same quantities as plain text for sentences and list rows: "37 km", "1 h 5 min". */
export const asText = (parts: Quantity | Quantity[]): string =>
  (Array.isArray(parts) ? parts : [parts]).map((q) => `${q.value}${NARROW_SPACE}${q.unit}`).join(' ');

const SPOKEN: Record<string, string> = { km: 'kilometres', 'km/h': 'kilometres per hour', m: 'metres', sec: 'seconds', min: 'minutes', h: 'hours' };
/** What a screen reader should say. */
export const spoken = (parts: Quantity | Quantity[]): string =>
  (Array.isArray(parts) ? parts : [parts]).map((q) => `${q.value} ${SPOKEN[q.unit] ?? q.unit}`).join(' ');
