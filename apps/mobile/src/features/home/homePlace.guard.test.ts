import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('home place screen', () => {
  const root = join(__dirname, '..', '..', '..');
  it('has its route', () => expect(existsSync(join(root, 'app', 'home-place.tsx'))).toBe(true));
  it('is reachable from You', () => expect(readFileSync(join(root, 'app', '(tabs)', 'you.tsx'), 'utf8')).toContain('/home-place'));
  it('says what the code does: searching sends the typed text and position, and auto-end may end a trip when guided home', () => {
    const src = readFileSync(join(root, 'app', 'home-place.tsx'), 'utf8');
    expect(src).not.toContain('never sent anywhere');
    expect(src).toContain('Searching sends what you type and your position to the place-search service.');
    expect(src).not.toContain('never ends a group ride or a trip');
    expect(src).toContain('never ends a group ride, and not a trip unless you are guided home');
  });
  it('the Ready Home row says what it opens: directions', () => {
    const src = readFileSync(join(root, 'app', 'ride', 'index.tsx'), 'utf8');
    expect(src).toContain('label="Ride home" sub="Directions home"');
  });
});
