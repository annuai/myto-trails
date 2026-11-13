import { beforeEach, describe, expect, it, vi } from 'vitest';

// The phone's storage is not available here; keep the state in memory.
vi.mock('./persist', () => ({ storage: undefined }));
import { mergeCompanion, useCompanion } from './companion';

beforeEach(() => useCompanion.getState().wipe());

describe('companion card', () => {
  it('starts with the bar layout and light ink', () => {
    expect(useCompanion.getState().card).toMatchObject({ format: 'story', layout: 'bar', ink: 'light' });
  });
  it('setCard({ format, stats }) keeps the remembered layout and ink', () => {
    useCompanion.getState().setCard({ layout: 'corner', ink: 'dark' });
    useCompanion.getState().setCard({ format: 'post', stats: ['time'] });
    expect(useCompanion.getState().card).toEqual({ format: 'post', stats: ['time'], layout: 'corner', ink: 'dark' });
  });
  it('wipe restores the defaults', () => {
    useCompanion.getState().setCard({ layout: 'corner', ink: 'dark', format: 'square' });
    useCompanion.getState().wipe();
    expect(useCompanion.getState().card).toMatchObject({ format: 'story', layout: 'bar', ink: 'light' });
  });
  it('a card saved by an older build rehydrates with the defaults', () => {
    const out = mergeCompanion({ card: { format: 'post', stats: ['time'] } }, useCompanion.getState());
    expect(out.card).toEqual({ format: 'post', stats: ['time'], layout: 'bar', ink: 'light' });
  });
  it('a saved card with a layout and ink keeps them', () => {
    const out = mergeCompanion({ card: { format: 'story', stats: [], layout: 'corner', ink: 'dark' } }, useCompanion.getState());
    expect(out.card).toMatchObject({ layout: 'corner', ink: 'dark' });
  });
});
