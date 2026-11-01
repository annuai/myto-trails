import type { CarryItem, WomenSafe } from '@moto-trails/domain';
import type { Status } from '@/ui/Chip';

export const WATER_MIN = 0.5;
export const WATER_MAX = 20;
export const CARRY_NOTES_MAX = 300;
export const ARRIVAL_NOTE_MAX = 200;
const WATER_PROBLEM = `Water is between ${WATER_MIN} and ${WATER_MAX} litres.`;

/** "2 litres of water per rider". */
export const waterText = (litres: number) => `${litres} ${litres === 1 ? 'litre' : 'litres'} of water per rider`;

/** What the women-safe line says, or null when there is nothing to say (no marks yet). Never says who marked. */
export function womenSafeDisplay(ws: WomenSafe | undefined): { text: string; status: Status } | null {
  if (!ws || ws.count <= 0) return null;
  if (ws.confirmed) return { text: 'Safe for women riders', status: 'good' };
  return { text: `Reported safe by ${ws.count} ${ws.count === 1 ? 'woman rider' : 'women riders'}`, status: 'unknown' };
}

/** The litres a rider typed: blank means none. */
export function parseWater(text: string): { value: number | undefined } | { error: string } {
  const t = text.trim();
  if (!t) return { value: undefined };
  const n = Number(t);
  return Number.isFinite(n) && n >= WATER_MIN && n <= WATER_MAX ? { value: n } : { error: WATER_PROBLEM };
}

type CarryForm = { water: string; notes: string; arrival: { from: number; to: number } | null; arrivalNote: string };

/** The first thing wrong with the optional carry and best-time fields, in words. */
export function carryProblem(f: CarryForm): string | undefined {
  const w = parseWater(f.water);
  if ('error' in w) return w.error;
  if (f.notes.trim().length > CARRY_NOTES_MAX) return `Keep the carry note under ${CARRY_NOTES_MAX} characters.`;
  if (f.arrival && f.arrival.from > f.arrival.to) return 'The best time to reach it must end after it starts.';
  if (f.arrivalNote.trim().length > ARRIVAL_NOTE_MAX) return `Keep the best-time note under ${ARRIVAL_NOTE_MAX} characters.`;
  return undefined;
}

/** The optional keys of submission step 3. Call after carryProblem is clear. */
export function carryFields(f: CarryForm & { items: CarryItem[] }) {
  const w = parseWater(f.water);
  const water = 'value' in w ? w.value : undefined;
  const notes = f.notes.trim();
  const note = f.arrivalNote.trim();
  return {
    ...(water !== undefined ? { waterLitres: water } : {}),
    ...(f.items.length ? { carry: f.items } : {}),
    ...(notes ? { carryNotes: notes } : {}),
    ...(f.arrival ? { arrivalFromMin: f.arrival.from, arrivalToMin: f.arrival.to } : {}),
    ...(note ? { arrivalNote: note } : {}),
  };
}
