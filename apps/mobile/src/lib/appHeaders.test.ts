import { describe, expect, it } from 'vitest';
import { APP_HEADERS } from './appHeaders';

describe('APP_HEADERS', () => {
  it('names the app and says where to find it, as OpenStreetMap services expect', () => {
    expect(APP_HEADERS['User-Agent']).toMatch(/^MytoMoto\/\d/);
    expect(APP_HEADERS['User-Agent']).toContain('https://moto-trails.com');
  });
});
