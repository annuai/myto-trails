import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './returnPath';

describe('safeReturnPath', () => {
  it('keeps an in-app path', () => {
    expect(safeReturnPath('/join/ABC234')).toBe('/join/ABC234');
  });
  it('falls back for anything that is not a plain in-app path', () => {
    for (const bad of ['https://evil.example/x', 'myto://auth', '//evil.example', '/\\evil', '/a\nb', 'join/ABC234', '', undefined, null, 5]) {
      expect(safeReturnPath(bad)).toBe('/you');
    }
  });
  it('uses the given fallback', () => {
    expect(safeReturnPath('nope', '/')).toBe('/');
  });
});
