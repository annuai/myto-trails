import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) && !/\.test\./.test(p) ? [p] : []; });

/** Screens that may swap themselves for another on purpose (ride flow, sign-in return, welcome, delete-everything, the logo that means Dash, a notification's link that only opens Pillion's dialog and steps aside). */
const REPLACE_OK = ['app/onboarding.tsx', 'app/ride/', 'app/join/', 'app/auth/', 'app/danger.tsx', 'app/delete-account.tsx', 'app/mileage.tsx', 'app/pillion.tsx', 'app/navigate.tsx', 'app/legal/', 'src/ResumeHost.tsx', 'src/ui/FloatingHeader.tsx', 'src/lib/goBack.ts'];

describe('back navigation', () => {
  it('only the allowed screens use router.replace, so Back is one step back everywhere else', () => {
    const offenders = [...walk('app'), ...walk('src')].filter((f) => /router\.replace\(/.test(readFileSync(f, 'utf8')) && !REPLACE_OK.some((ok) => f.startsWith(ok)));
    expect(offenders).toEqual([]);
  });
});
