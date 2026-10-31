import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('EXPO_PUBLIC_API_BASE', 'https://api.test/api/v1');

// A request that never answers, and ends only when it is aborted: what a dropped connection looks like.
const hang = (_url: string, init: RequestInit) => new Promise<Response>((_, reject) => { init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))); });

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('api timeout', () => {
  it('gives up on a request that never answers, with a message that says why', async () => {
    vi.stubGlobal('fetch', vi.fn(hang));
    const { api, ApiFailure } = await import('./client');
    const p = api('/trails').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(20_000);
    const e = await p;
    expect(e).toBeInstanceOf(ApiFailure);
    expect(e).toMatchObject({ status: 0, code: 'timeout' });
    expect((e as Error).message).toMatch(/too long/i);
  });
  it('does not time out a request that answers in time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 })));
    const { api } = await import('./client');
    await expect(api('/trails')).resolves.toEqual({ ok: 1 });
    await vi.advanceTimersByTimeAsync(30_000);
  });
  it('still stops when the caller cancels, and says nothing about a timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(hang));
    const { api } = await import('./client');
    const ctl = new AbortController();
    const p = api('/trails', { signal: ctl.signal }).catch((e: unknown) => e);
    ctl.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(await p).toMatchObject({ code: 'network' });
  });
});
