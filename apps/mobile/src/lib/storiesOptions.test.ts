import { describe, expect, it } from 'vitest';
import { storiesAppId, storiesOptions } from './storiesOptions';

describe('storiesAppId', () => {
  it('accepts a Facebook App ID (digits)', () => expect(storiesAppId('1234567890123456')).toBe('1234567890123456'));
  it('trims spaces', () => expect(storiesAppId('  1234567890 \n')).toBe('1234567890'));
  it.each([[undefined], [''], ['   '], ['abc'], ['12 34'], ['123'], ['your-app-id']])('treats %j as not set up', (v) => expect(storiesAppId(v)).toBeUndefined());
});

describe('storiesOptions', () => {
  const photo = 'file:///tmp/photo.jpg';
  const sticker = 'file:///tmp/overlay.png';
  it('a photo with an overlay sticker: both layers, no colours', () => {
    expect(storiesOptions('111111', { backgroundUri: photo, stickerUri: sticker })).toEqual({ appId: '111111', backgroundImage: photo, stickerImage: sticker });
  });
  it('a finished card on its own: only the background layer', () => {
    expect(storiesOptions('111111', { backgroundUri: photo })).toEqual({ appId: '111111', backgroundImage: photo });
  });
  it('a sticker on its own gets one solid colour behind it, the same top and bottom', () => {
    const o = storiesOptions('111111', { stickerUri: sticker });
    expect(o.stickerImage).toBe(sticker);
    expect(o.backgroundImage).toBeUndefined();
    expect(o.backgroundTopColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(o.backgroundTopColor).toBe(o.backgroundBottomColor);
  });
  it('refuses to share nothing', () => expect(() => storiesOptions('111111', {})).toThrow(/nothing to share/i));
});
