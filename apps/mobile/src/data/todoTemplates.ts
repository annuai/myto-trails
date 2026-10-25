import type { Todo } from '@/lib/todos';

export type Template = { key: string; title: string; hint: string; category: Todo['category']; kind: 'date' | 'service'; everyKm?: number; everyMonths?: number };

// Suggested intervals are starting points; the owner's manual wins. They are editable per item.
export const templates: Template[] = [
  { key: 'puc', title: 'PUC certificate', hint: 'Pick the expiry date', category: 'document', kind: 'date' },
  { key: 'insurance', title: 'Insurance renewal', hint: 'Pick the expiry date', category: 'document', kind: 'date' },
  { key: 'licence', title: 'Driving licence renewal', hint: 'Pick the expiry date', category: 'document', kind: 'date' },
  { key: 'chain-lube', title: 'Chain lube', hint: 'Every 500 km or 1 month', category: 'service', kind: 'service', everyKm: 500, everyMonths: 1 },
  { key: 'chain-adjust', title: 'Chain clean and adjust', hint: 'Every 1,500 km or 3 months', category: 'service', kind: 'service', everyKm: 1500, everyMonths: 3 },
  { key: 'engine-oil', title: 'Engine oil change', hint: 'Every 5,000 km or 6 months', category: 'service', kind: 'service', everyKm: 5000, everyMonths: 6 },
  { key: 'service', title: 'Full service', hint: 'Every 6,000 km or 6 months', category: 'service', kind: 'service', everyKm: 6000, everyMonths: 6 },
  { key: 'tyres', title: 'Tyre pressure check', hint: 'Every month', category: 'service', kind: 'service', everyMonths: 1 },
  { key: 'camera', title: 'Charge action camera', hint: 'Pick a date', category: 'pack', kind: 'date' },
  { key: 'first-aid', title: 'Pack first-aid kit', hint: 'Pick a date', category: 'pack', kind: 'date' },
];
