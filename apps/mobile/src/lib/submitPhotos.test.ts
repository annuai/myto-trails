import { describe, expect, it } from 'vitest';
import { MAX_SUBMISSION_PHOTOS, photoStep } from './submitPhotos';

describe('photoStep', () => {
  it('sends nothing when there are no photos', () => expect(photoStep()).toEqual([]));
  it('keeps the order and trims the descriptions to the 300 the server allows', () => {
    const out = photoStep([{ mediaId: 'a', altText: '  Gate at the start  ' }, { mediaId: 'b', altText: 'x'.repeat(400) }]);
    expect(out.map((p) => p.mediaId)).toEqual(['a', 'b']);
    expect(out[0]!.altText).toBe('Gate at the start');
    expect(out[1]!.altText).toHaveLength(300);
  });
  it('matches the server limit of 8 photos', () => expect(MAX_SUBMISSION_PHOTOS).toBe(8));
});
