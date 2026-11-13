import { describe, expect, it } from 'vitest';
import { checkSpace, filterInstalled, resolveManifest, runDownload, type DownloadFs, type IndexEntry } from './download';
import type { Region } from './manifest';

const MB = 1024 * 1024;
const DIR = 'file:///docs/regions/';
const region = (over: Partial<Region> = {}): Region => ({
  id: 'goa',
  name: 'Goa',
  bbox: [73, 14, 75, 16],
  version: 'v2',
  map: { url: 'https://r2/goa.map', bytes: 100 * MB, sha256: 'aa' },
  search: { url: 'https://r2/goa.search', bytes: 10 * MB, sha256: 'bb' },
  ...over,
});

describe('checkSpace', () => {
  const r = region(); // 110 MB, needs 121 MB
  it('is ok with room to spare', () => expect(checkSpace(200 * MB, r)).toEqual({ ok: true }));
  it('refuses below total plus 10 percent, naming the megabytes needed', () => {
    const res = checkSpace(115 * MB, r);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain('121 MB');
  });
  it('refuses exactly at the boundary', () => expect(checkSpace(121 * MB, r).ok).toBe(false));
});

/** An in-memory phone: files by path, a log of every write, and a switch to die mid-download. */
function fakeFs(opts: { free?: number; hashes?: Record<string, string>; dieOn?: string } = {}) {
  const files = new Map<string, { size: number; text?: string }>();
  const log: string[] = [];
  const fs: DownloadFs = {
    freeBytes: async () => opts.free ?? 10_000 * MB,
    makeDir: async () => { log.push('mkdir'); },
    size: async (p) => files.get(p)?.size ?? null,
    readText: async (p) => files.get(p)?.text ?? null,
    writeText: async (p, t) => { log.push(`write ${p}`); files.set(p, { size: t.length, text: t }); },
    remove: async (p) => { log.push(`rm ${p}`); files.delete(p); },
    move: async (a, b) => { log.push(`mv ${a}`); files.set(b, files.get(a)!); files.delete(a); },
    fetchTo: async (url, path, from, onBytes) => {
      log.push(`fetch ${url} from ${from}`);
      const total = url.endsWith('map') ? 100 * MB : 10 * MB;
      if (opts.dieOn === url) { files.set(path, { size: total / 2 }); throw new Error('killed'); }
      onBytes(total);
      files.set(path, { size: total });
    },
    sha256: async (p) => opts.hashes?.[p] ?? (p.includes('map') ? 'aa' : 'bb'),
  };
  return { fs, files, log };
}

describe('runDownload', () => {
  it('refuses on low space before writing anything', async () => {
    const { fs, log } = fakeFs({ free: 50 * MB });
    await expect(runDownload(fs, DIR, region(), () => {})).rejects.toThrow(/space/i);
    expect(log).toEqual([]);
  });

  it('installs both files and writes the index entry last', async () => {
    const { fs, files, log } = fakeFs();
    const pcts: number[] = [];
    await runDownload(fs, DIR, region(), (p) => pcts.push(p));
    expect(files.has(`${DIR}goa.v2.map`)).toBe(true);
    expect(files.has(`${DIR}goa.v2.search`)).toBe(true);
    expect(files.has(`${DIR}goa.v2.map.part`)).toBe(false);
    const commit = log.indexOf(`mv ${DIR}index.json.tmp`);
    expect(commit).toBe(log.length - 1);
    expect(log.lastIndexOf(`mv ${DIR}goa.v2.search.part`)).toBeLessThan(commit);
    expect(pcts[pcts.length - 1]).toBe(100);
    expect(JSON.parse(files.get(`${DIR}index.json`)!.text!)).toEqual([{ id: 'goa', version: 'v2', bbox: [73, 14, 75, 16] }]);
  });

  it('a killed download leaves nothing installed and the part files for a resume', async () => {
    const { fs, files } = fakeFs({ dieOn: 'https://r2/goa.search' });
    await expect(runDownload(fs, DIR, region(), () => {})).rejects.toThrow();
    expect(files.has(`${DIR}index.json`)).toBe(false);
    expect(files.has(`${DIR}goa.v2.map`)).toBe(false);
    expect(files.has(`${DIR}goa.v2.search.part`)).toBe(true);
  });

  it('resumes from the bytes already on disk', async () => {
    const { fs, files, log } = fakeFs();
    files.set(`${DIR}goa.v2.map.part`, { size: 40 * MB });
    await runDownload(fs, DIR, region(), () => {});
    expect(log).toContain(`fetch https://r2/goa.map from ${40 * MB}`);
  });

  it('a damaged file is deleted, reported in plain words and never installed', async () => {
    const { fs, files } = fakeFs({ hashes: { [`${DIR}goa.v2.map.part`]: 'wrong' } });
    await expect(runDownload(fs, DIR, region(), () => {})).rejects.toThrow('The download was damaged, try again');
    expect(files.has(`${DIR}goa.v2.map.part`)).toBe(false);
    expect(files.has(`${DIR}index.json`)).toBe(false);
  });

  it('removes the files of the older version only after the new one is in', async () => {
    const { fs, files, log } = fakeFs();
    files.set(`${DIR}goa.v1.map`, { size: 1 });
    files.set(`${DIR}goa.v1.search`, { size: 1 });
    files.set(`${DIR}index.json`, { size: 1, text: JSON.stringify([{ id: 'goa', version: 'v1', bbox: [73, 14, 75, 16] }, { id: 'ker', version: 'v1', bbox: [74, 8, 77, 12] }]) });
    await runDownload(fs, DIR, region(), () => {});
    const idx = JSON.parse(files.get(`${DIR}index.json`)!.text!);
    expect(idx.map((e: IndexEntry) => `${e.id}:${e.version}`)).toEqual(['goa:v2', 'ker:v1']);
    expect(files.has(`${DIR}goa.v1.map`)).toBe(false);
    expect(log.indexOf(`rm ${DIR}goa.v1.map`)).toBeGreaterThan(log.indexOf(`mv ${DIR}index.json.tmp`));
  });
});

describe('resolveManifest', () => {
  const good = { format: 1, regions: [region()] };
  const cached = [region({ id: 'old' })];
  const mk = (fetched: () => Promise<unknown>, cache: Region[] | null) => {
    const saved: Region[][] = [];
    return { saved, run: () => resolveManifest({ fetchJson: fetched, readCache: async () => cache, writeCache: async (r) => { saved.push(r); } }) };
  };
  it('returns and caches a valid fetch', async () => {
    const t = mk(async () => good, cached);
    expect((await t.run()).map((r) => r.id)).toEqual(['goa']);
    expect(t.saved).toHaveLength(1);
  });
  it('keeps the cached list when the fetch fails', async () => {
    const t = mk(async () => { throw new Error('offline'); }, cached);
    expect(await t.run()).toEqual(cached);
    expect(t.saved).toHaveLength(0);
  });
  it('keeps the cached list when the manifest is invalid, and never caches it', async () => {
    const t = mk(async () => ({ format: 9 }), cached);
    expect(await t.run()).toEqual(cached);
    expect(t.saved).toHaveLength(0);
  });
  it('is empty with nothing cached and nothing fetched', async () => {
    expect(await mk(async () => { throw new Error('x'); }, null).run()).toEqual([]);
  });
});

describe('filterInstalled', () => {
  it('drops entries whose files are missing', async () => {
    const entries: IndexEntry[] = [
      { id: 'goa', version: 'v2', bbox: [73, 14, 75, 16] },
      { id: 'ker', version: 'v1', bbox: [74, 8, 77, 12] },
    ];
    const present = new Set([`${DIR}goa.v2.map`, `${DIR}goa.v2.search`, `${DIR}ker.v1.map`]);
    const out = await filterInstalled(DIR, entries, async (p) => present.has(p));
    expect(out.map((i) => i.id)).toEqual(['goa']);
    expect(out[0].mapPath).toBe(`${DIR}goa.v2.map`);
    expect(out[0].searchPath).toBe(`${DIR}goa.v2.search`);
  });
});
