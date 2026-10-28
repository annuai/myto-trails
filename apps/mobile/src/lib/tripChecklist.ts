/** What most riders pack for a trip. Added in one tap, then trimmed to taste. */
export const STARTER_ITEMS = [
  'Helmet and gloves', 'Riding jacket and pants', 'Rain gear', 'Documents (licence, RC, insurance, PUC)', 'Tool kit and puncture kit', 'Spare tube or sealant',
  'Chain lube', 'Power bank and charging cable', 'Water and snacks', 'First-aid kit', 'Cash', 'Phone mount and offline maps',
];

/** A pack list kept on a trip before pack items became to-dos. Old trips may still carry one; nothing reads it now. */
export type ChecklistItem = { id: string; text: string; done: boolean };

const clean = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 80);

/** The lines from `texts` worth adding: cleaned, not empty, and not already among `existing` (ignoring case) or repeated. */
export function newItems(existing: string[], texts: string[]): string[] {
  const have = new Set(existing.map((e) => e.toLowerCase()));
  const out: string[] = [];
  for (const raw of texts) {
    const text = clean(raw);
    if (text && !have.has(text.toLowerCase())) { have.add(text.toLowerCase()); out.push(text); }
  }
  return out;
}
