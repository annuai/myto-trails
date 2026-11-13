import { beforeEach, describe, expect, it, vi } from 'vitest';

const picker = vi.hoisted(() => ({
  launchImageLibraryAsync: vi.fn(),
  launchCameraAsync: vi.fn(),
  requestCameraPermissionsAsync: vi.fn(),
}));
vi.mock('expo-image-picker', () => picker);
import { pickCardPhoto } from './pickPhoto';

const asset = { uri: 'file:///p.jpg', width: 1080, height: 1920 };
beforeEach(() => { vi.resetAllMocks(); });

describe('pickCardPhoto', () => {
  it('crops the library photo to the format and returns the asset', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
    const r = await pickCardPhoto('library', 'story');
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({ mediaTypes: ['images'], allowsEditing: true, aspect: [1080, 1920], quality: 1, exif: false });
    expect(r).toEqual({ ok: true, photo: asset });
  });
  it('asks for camera permission, then launches the camera', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [asset] });
    const r = await pickCardPhoto('camera', 'post');
    expect(picker.launchCameraAsync).toHaveBeenCalledWith({ mediaTypes: ['images'], allowsEditing: true, aspect: [1080, 1350], quality: 1, exif: false });
    expect(r.ok).toBe(true);
  });
  it('reports a cancelled picker with an empty message', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    expect(await pickCardPhoto('library', 'square')).toEqual({ ok: false, reason: 'cancelled', message: '' });
  });
  it('reports denied camera permission and never launches the camera', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    const r = await pickCardPhoto('camera', 'story');
    expect(r).toMatchObject({ ok: false, reason: 'denied' });
    expect(r.ok === false && r.message.length).toBeGreaterThan(0);
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });
  it('reports a thrown error as failed', async () => {
    picker.launchImageLibraryAsync.mockRejectedValue(new Error('boom'));
    const r = await pickCardPhoto('library', 'story');
    expect(r).toMatchObject({ ok: false, reason: 'failed' });
    expect(r.ok === false && r.message.length).toBeGreaterThan(0);
  });
});
