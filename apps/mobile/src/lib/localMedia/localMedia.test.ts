import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });

describe('localMedia stays on the phone', () => {
  it('has source files to check', () => expect(sources(here).length).toBeGreaterThan(0));
  it('imports nothing from src/api, and no network client', () => {
    for (const file of sources(here)) {
      const imports = [...readFileSync(file, 'utf8').matchAll(/(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const spec of imports) {
        expect(spec, `${file} imports ${spec}`).not.toMatch(/(^|\/)api(\/|$)/);
        expect(spec, `${file} imports ${spec}`).not.toMatch(/uploadImage|submit|signIn/);
      }
    }
  });
});
