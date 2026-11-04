import { beforeEach, describe, expect, it } from 'vitest';
import { useRideDraft } from './rideDraft';

describe('ride draft', () => {
  beforeEach(() => useRideDraft.getState().clear());
  it('keeps the chosen place and answer for as long as the app runs, whatever page is open', () => {
    useRideDraft.getState().setDest({ lat: 12.9, lng: 77.5, name: 'Nandi Hills' });
    useRideDraft.getState().setPicked('place');
    expect(useRideDraft.getState().dest?.name).toBe('Nandi Hills');
    expect(useRideDraft.getState().picked).toBe('place');
  });
  it('is emptied when a ride starts', () => {
    useRideDraft.getState().setDest({ lat: 1, lng: 2, name: 'x' });
    useRideDraft.getState().setPicked('place');
    useRideDraft.getState().clear();
    expect(useRideDraft.getState().dest).toBeUndefined();
    expect(useRideDraft.getState().picked).toBeUndefined();
  });
  it('is not saved to the phone', () => {
    expect((useRideDraft as unknown as { persist?: unknown }).persist).toBeUndefined();
  });
});
