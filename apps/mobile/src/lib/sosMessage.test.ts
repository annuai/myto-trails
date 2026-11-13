import { describe, expect, it } from 'vitest';
import { sosMessage } from './sosMessage';

describe('sosMessage', () => {
  it('has a map link to five decimals when there is a position', () => expect(sosMessage({ lat: 13.0432333, lng: 77.5124106 })).toBe('I need help. My position: https://maps.google.com/?q=13.04323,77.51241'));
  it.each([[undefined], [null]])('says the position is not available for %s', (p) => expect(sosMessage(p)).toBe('I need help. My position is not available.'));
});
