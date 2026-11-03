import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The values a file exports (types are erased, so they do not count). */
function exportsOf(source: string): string[] {
  const names = new Set<string>();
  for (const m of source.matchAll(/^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]!);
  for (const m of source.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const part of m[1]!.split(',')) { const n = part.trim().replace(/^type\s.*/, '').split(/\s+as\s+/).pop()?.trim(); if (n) names.add(n); }
  return [...names];
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { if (name !== 'node_modules') walk(path, out); } else out.push(path);
  }
  return out;
}

const root = new URL('.', import.meta.url).pathname;
const pairs = walk(root).filter((f) => /\.web\.tsx?$/.test(f)).map((web) => ({ web, native: web.replace(/\.web(\.tsx?)$/, '$1') })).filter((p) => { try { return statSync(p.native).isFile(); } catch { return false; } });

// Typecheck only sees one file of each pair, so a function added to the phone version and forgotten in the web version
// compiles cleanly and then crashes the web build when it is called.
describe('web versions of files', () => {
  it('has pairs to check', () => expect(pairs.length).toBeGreaterThan(0));
  for (const { web, native } of pairs) {
    it(`${web.slice(root.length)} exports everything ${native.slice(root.length)} does`, () => {
      const have = new Set(exportsOf(readFileSync(web, 'utf8')));
      expect(exportsOf(readFileSync(native, 'utf8')).filter((n) => !have.has(n))).toEqual([]);
    });
  }
});
