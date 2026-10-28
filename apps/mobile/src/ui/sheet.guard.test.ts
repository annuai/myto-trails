import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? (f === 'node_modules' ? [] : files(p)) : /\.tsx?$/.test(f) ? [p] : [];
});

describe('input over a screen', () => {
  it('Sheet lifts itself above the keyboard, so a field in a sheet is never hidden', () => {
    expect(readFileSync(join(__dirname, 'Sheet.tsx'), 'utf8')).toMatch(/keyboardWillChangeFrame/);
  });
  it('nothing uses the native Modal, which would bypass that: inputs that open over a screen go in a Sheet', () => {
    const bad = [...files(join(__dirname, '..', '..', 'app')), ...files(join(__dirname, '..'))].filter((f) => /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*'react-native'/.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });
});
