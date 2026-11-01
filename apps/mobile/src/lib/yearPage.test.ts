import { describe, expect, it } from 'vitest';
import { pageLabel, pageStartFor, yearPage } from './yearPage';

describe('year pages', () => {
  it('opens on a page that contains the year, with a few earlier ones before it', () => {
    const start = pageStartFor(2026);
    expect(yearPage(start)).toContain(2026);
    expect(yearPage(start)[0]).toBe(2022);
    expect(yearPage(start)).toHaveLength(12);
  });
  it('labels the span', () => { expect(pageLabel(2022)).toBe('2022 to 2033'); });
});
