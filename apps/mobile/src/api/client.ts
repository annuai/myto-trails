import { API_BASE } from './config';

export class ApiFailure extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly fields?: Record<string, string>) { super(message); }
}

type Opts = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; token?: string | null; signal?: AbortSignal };

/** How long to wait for an answer before saying so. On a weak signal a request can neither succeed nor fail; without this the screen shows Loading for ever. */
export const REQUEST_TIMEOUT_MS = 20_000;
const SLOW = 'Moto Trails is taking too long to answer. Check your connection and try again.';
const OFFLINE = 'Cannot reach Moto Trails. Check your connection.';

/** One place that talks to /api/v1: JSON in and out, bearer token when signed in, one error type. */
export async function api<T>(path: string, { method = 'GET', body, token, signal }: Opts = {}): Promise<T> {
  const ctl = new AbortController();
  const cancel = () => ctl.abort();
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) ctl.abort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method, signal: ctl.signal,
        headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      if (timedOut) throw new ApiFailure(0, 'timeout', SLOW);
      throw new ApiFailure(0, 'network', OFFLINE);
    }
    return await read<T>(res, () => timedOut);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

async function read<T>(res: Response, timedOut: () => boolean): Promise<T> {
  if (res.status === 204) return undefined as T;
  let text: string;
  try { text = await res.text(); } catch { throw new ApiFailure(0, timedOut() ? 'timeout' : 'network', timedOut() ? SLOW : OFFLINE); }
  let json: unknown;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | undefined)?.error;
    throw new ApiFailure(res.status, e?.code ?? 'error', e?.message ?? `Request failed (${res.status}).`, e?.fields);
  }
  return json as T;
}
