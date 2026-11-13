import { describe, expect, it } from 'vitest';
import { checkSpace, createInflight, createSerial, filterInstalled, rangePlan, resolveManifest, runDelete, runDownload, type DownloadFs, type IndexEntry } from './download';
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
    list: async (dir) => [...files.keys()].filter((k) => k.startsWith(dir)).map((k) => k.slice(dir.length)),
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

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('createInflight', () => {
  it('runs one download for a double call and shares progress', async () => {
    const inflight = createInflight();
    let starts = 0;
    let emit: (p: number) => void = () => {};
    let finish: () => void = () => {};
    const start = (e: (p: number) => void) => { starts++; emit = e; return new Promise<void>((r) => { finish = r; }); };
    const a: number[] = [];
    const b: number[] = [];
    const p1 = inflight.run('goa', start, (p) => a.push(p));
    const p2 = inflight.run('goa', start, (p) => b.push(p));
    emit(40);
    finish();
    await Promise.all([p1, p2]);
    expect(starts).toBe(1);
    expect([a, b]).toEqual([[40], [40]]);
  });
  it('frees the slot after a failure so a retry runs', async () => {
    const inflight = createInflight();
    let starts = 0;
    await expect(inflight.run('goa', async () => { starts++; throw new Error('x'); })).rejects.toThrow();
    await inflight.run('goa', async () => { starts++; });
    expect(starts).toBe(2);
  });
});

describe('index writes are serialized', () => {
  it('two regions finishing together both end up in the index', async () => {
    const { fs, files } = fakeFs();
    const slow: DownloadFs = { ...fs, readText: async (p) => { const t = await fs.readText(p); await tick(); return t; } };
    const ker = region({ id: 'ker', name: 'Kerala', bbox: [74, 8, 77, 12] });
    await Promise.all([runDownload(slow, DIR, region(), () => {}), runDownload(slow, DIR, ker, () => {})]);
    const ids = JSON.parse(files.get(`${DIR}index.json`)!.text!).map((e: IndexEntry) => e.id).sort();
    expect(ids).toEqual(['goa', 'ker']);
  });
  it('runs jobs in order and survives a failing one', async () => {
    const serial = createSerial();
    const order: number[] = [];
    const a = serial(async () => { await tick(); order.push(1); throw new Error('x'); });
    const b = serial(async () => { order.push(2); });
    await expect(a).rejects.toThrow();
    await b;
    expect(order).toEqual([1, 2]);
  });
});

describe('rangePlan', () => {
  it('appends on 206 with an offset', () => expect(rangePlan(206, 40)).toBe('append'));
  it('restarts when the server ignored the range (200 with an offset)', () => expect(rangePlan(200, 40)).toBe('restart'));
  it('treats 416 on a resume as already complete', () => expect(rangePlan(416, 40)).toBe('done'));
  it('writes fresh on 200 with no offset', () => expect(rangePlan(200, 0)).toBe('fresh'));
  it('fails in plain words on 404 and 500', () => {
    expect(() => rangePlan(404, 0)).toThrow(/could not finish/i);
    expect(() => rangePlan(500, 40)).toThrow(/could not finish/i);
  });
  it('416 with nothing on disk is a failure, not completion', () => expect(() => rangePlan(416, 0)).toThrow());
});

describe('runDelete', () => {
  it('removes leftover part files and does nothing else when no entry matches, even with no folder yet', async () => {
    const { fs, files, log } = fakeFs();
    await runDelete(fs, DIR, 'goa');
    expect(log).toEqual([]);
    files.set(`${DIR}goa.v2.map.part`, { size: 5 });
    files.set(`${DIR}ker.v1.map.part`, { size: 5 });
    await runDelete(fs, DIR, 'goa');
    expect(files.has(`${DIR}goa.v2.map.part`)).toBe(false);
    expect(files.has(`${DIR}ker.v1.map.part`)).toBe(true);
    expect(files.has(`${DIR}index.json`)).toBe(false);
  });
  it('removes files and the entry for an installed region', async () => {
    const { fs, files } = fakeFs();
    await runDownload(fs, DIR, region(), () => {});
    await runDelete(fs, DIR, 'goa');
    expect(files.has(`${DIR}goa.v2.map`)).toBe(false);
    expect(JSON.parse(files.get(`${DIR}index.json`)!.text!)).toEqual([]);
  });
});

describe('plain-words errors', () => {
  it('wraps a raw file error and keeps it as the cause', async () => {
    const { fs } = fakeFs();
    const boom = new Error('ENOENT native thing');
    const err = await runDownload({ ...fs, sha256: async () => { throw boom; } }, DIR, region(), () => {}).catch((e) => e);
    expect(err.message).not.toMatch(/ENOENT/);
    expect(err.cause).toBe(boom);
  });
});
