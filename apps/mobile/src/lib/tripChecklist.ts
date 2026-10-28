import { uid } from './id';

export type ChecklistItem = { id: string; text: string; done: boolean };

/** What most riders pack for a trip. Added in one tap, then trimmed to taste. */
export const STARTER_ITEMS = [
  'Helmet and gloves', 'Riding jacket and pants', 'Rain gear', 'Documents (licence, RC, insurance, PUC)', 'Tool kit and puncture kit', 'Spare tube or sealant',
  'Chain lube', 'Power bank and charging cable', 'Water and snacks', 'First-aid kit', 'Cash', 'Phone mount and offline maps',
];

const clean = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 80);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The list with these items added. An empty line, and one already on the list (ignoring case), is skipped. */
export function withItems(list: ChecklistItem[] | undefined, texts: string[]): ChecklistItem[] {
  const out = [...(list ?? [])];
  for (const raw of texts) {
    const text = clean(raw);
    if (text && !out.some((i) => same(i.text, text))) out.push({ id: uid(), text, done: false });
  }
  return out;
}

export const progress = (list: ChecklistItem[] | undefined) => ({ done: (list ?? []).filter((i) => i.done).length, total: (list ?? []).length });
