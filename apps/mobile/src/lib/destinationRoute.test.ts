import { describe, expect, it } from 'vitest';
import { needsReroute } from './destinationRoute';

const here = { lat: 12, lng: 77 }, there = { lat: 12.2, lng: 77.2 };

describe('needsReroute', () => {
  it('fetches the first time', () => expect(needsReroute(undefined, here, there)).toBe(true));
  it('keeps the line while the rider stays near where it started', () => expect(needsReroute({ from: here, to: there }, { lat: 12.001, lng: 77 }, there)).toBe(false));
  it('fetches again after 300 m', () => expect(needsReroute({ from: here, to: there }, { lat: 12.004, lng: 77 }, there)).toBe(true));
  it('fetches again when the destination moves', () => expect(needsReroute({ from: here, to: there }, here, { lat: 12.3, lng: 77.2 })).toBe(true));
});
