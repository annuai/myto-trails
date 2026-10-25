import { API_BASE } from './config';

export class ApiFailure extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly fields?: Record<string, string>) { super(message); }
}

type Opts = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; token?: string | null; signal?: AbortSignal };

/** One place that talks to /api/v1: JSON in and out, bearer token when signed in, one error type. */
export async function api<T>(path: string, { method = 'GET', body, token, signal }: Opts = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method, signal,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiFailure(0, 'network', 'Cannot reach Moto Trails. Check your connection.');
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let json: unknown;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  if (!res.ok) {
    const e = (json as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | undefined)?.error;
    throw new ApiFailure(res.status, e?.code ?? 'error', e?.message ?? `Request failed (${res.status}).`, e?.fields);
  }
  return json as T;
}
