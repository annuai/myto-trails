import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('note sheet', () => {
  const src = readFileSync(join(__dirname, 'NoteSheet.tsx'), 'utf8');
  it('never saves or closes itself from an effect: a change in motion must not interrupt typing', () => {
    const effects = [...src.matchAll(/useEffect\(([\s\S]*?)\n\s*\}, \[/g)].map((m) => m[1]);
    for (const e of effects) expect(e).not.toMatch(/onClose|onSave/);
  });
  it('keeps the draft when dismissed, clearing it only on save', () => {
    expect(src).not.toMatch(/const close = \(\) => \{ setText\(''\)/);
  });
});
