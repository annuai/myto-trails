import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('home place screen', () => {
  const root = join(__dirname, '..', '..', '..');
  it('has its route', () => expect(existsSync(join(root, 'app', 'home-place.tsx'))).toBe(true));
  it('is reachable from You', () => expect(readFileSync(join(root, 'app', '(tabs)', 'you.tsx'), 'utf8')).toContain('/home-place'));
});
