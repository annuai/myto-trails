import { describe, expect, it } from 'vitest';
import { imageName, metaName, nameHash, planFor, resolveCached, type CacheFs } from './imageCacheCore';

function memFs(online = true) {
  const files = new Map<string, string>();
  let downloads = 0;
  const fs: CacheFs = {
    makeDir: async () => undefined,
    read: async (p) => files.get(p) ?? null,
    write: async (p, t) => { files.set(p, t); },
    exists: async (p) => files.has(p),
    download: async (url, to) => { if (!online) return false; downloads++; files.set(to, `bytes:${url}`); return true; },
    move: async (a, b) => { files.set(b, files.get(a)!); files.delete(a); },
    remove: async (p) => { files.delete(p); },
  };
  return { fs, files, downloads: () => downloads };
}
const DIR = 'file:///x/private-images/';

describe('names', () => {
  it('hash is stable, short and carries no text', () => {
    expect(nameHash('avatar')).toBe(nameHash('avatar'));
    expect(nameHash('avatar')).not.toBe(nameHash('bike-photo'));
    expect(nameHash('avatar')).toMatch(/^[0-9a-f]{8}$/);
    const n = imageName('avatar', 'https://cdn.example/me/jo-smith.jpg');
    expect(n).toMatch(/^[0-9a-f]{8}-[0-9a-f]{8}\.img$/);
    expect(metaName('bike-photo')).toMatch(/^[0-9a-f]{8}\.json$/);
  });
  it('a new address is a new file name', () => expect(imageName('avatar', 'a')).not.toBe(imageName('avatar', 'b')));
});

describe('planFor', () => {
  it('deletes when the picture was removed', () => expect(planFor(null, { url: 'a' }, true)).toBe('delete'));
  it('keeps an unchanged copy', () => expect(planFor('a', { url: 'a' }, true)).toBe('keep'));
  it('downloads when changed, missing, or the file is gone', () => {
    expect(planFor('b', { url: 'a' }, true)).toBe('download');
    expect(planFor('a', null, false)).toBe('download');
    expect(planFor('a', { url: 'a' }, false)).toBe('download');
  });
});

describe('resolveCached', () => {
  it('downloads once, then reuses', async () => {
    const m = memFs();
    const first = await resolveCached(m.fs, DIR, 'avatar', 'https://u/1');
    const second = await resolveCached(m.fs, DIR, 'avatar', 'https://u/1');
    expect(second).toBe(first);
    expect(m.downloads()).toBe(1);
  });
  it('re-downloads a changed picture and removes the old file', async () => {
    const m = memFs();
    const a = await resolveCached(m.fs, DIR, 'avatar', 'https://u/1');
    const b = await resolveCached(m.fs, DIR, 'avatar', 'https://u/2');
    expect(b).not.toBe(a);
    expect(m.files.has(a!)).toBe(false);
    expect(m.files.get(b!)).toBe('bytes:https://u/2');
  });
  it('keeps the two keys apart', async () => {
    const m = memFs();
    const a = await resolveCached(m.fs, DIR, 'avatar', 'https://u/1');
    const b = await resolveCached(m.fs, DIR, 'bike-photo', 'https://u/1');
    expect(a).not.toBe(b);
  });
  it('returns the old copy when offline, null when there is none', async () => {
    const on = memFs();
    const a = await resolveCached(on.fs, DIR, 'avatar', 'https://u/1');
    const off = memFs(false);
    off.files = on.files;
    const files = on.files;
    const offFs: CacheFs = { ...off.fs, read: async (p) => files.get(p) ?? null, write: async (p, t) => { files.set(p, t); }, exists: async (p) => files.has(p), remove: async (p) => { files.delete(p); }, move: async () => undefined };
    expect(await resolveCached(offFs, DIR, 'avatar', 'https://u/2')).toBe(a);
    expect(await resolveCached(memFs(false).fs, DIR, 'avatar', 'https://u/2')).toBeNull();
  });
  it('deletes the copy when the picture is removed', async () => {
    const m = memFs();
    await resolveCached(m.fs, DIR, 'avatar', 'https://u/1');
    expect(await resolveCached(m.fs, DIR, 'avatar', null)).toBeNull();
    expect(m.files.size).toBe(0);
  });
  it('leaves no half-downloaded file when the download fails', async () => {
    const m = memFs(false);
    await resolveCached(m.fs, DIR, 'avatar', 'https://u/1');
    expect(m.files.size).toBe(0);
  });
});
