import { API_BASE_URL } from '@/config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let authToken: string | null = null;
export const setAuthToken = (t: string | null) => { authToken = t; };

type Options = { method?: string; body?: any; token?: string; signal?: AbortSignal };

// Every response from the OrdinCore API is { success, data, meta } or { success, message }.
// unwrap returns .data; request throws ApiError with the server's message on failure.
export async function request<T = any>(path: string, opts: Options = {}): Promise<T> {
  const token = opts.token ?? authToken;
  const method = opts.method || 'GET';
  // Mobile must always reflect the LIVE server. Android's networking layer (OkHttp) caches GET
  // responses per-URL, which made some screens show stale data while others were fresh. Defeat it
  // three ways: cache:'no-store', explicit no-cache headers, and a per-request cache-busting param
  // on GETs (a changing URL can never hit the HTTP cache). The server ignores the extra param.
  let url = `${API_BASE_URL}${path}`;
  if (method === 'GET') url += `${path.includes('?') ? '&' : '?'}_ts=${Date.now()}`;
  const res = await fetch(url, {
    method,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  let json: any = null;
  try { json = await res.json(); } catch { /* empty / non-json */ }

  if (!res.ok || json?.success === false) {
    const msg = json?.message || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return (json?.data ?? json) as T;
}

export const api = {
  get: <T = any>(p: string, token?: string) => request<T>(p, { token }),
  post: <T = any>(p: string, body?: any, token?: string) => request<T>(p, { method: 'POST', body, token }),
  patch: <T = any>(p: string, body?: any, token?: string) => request<T>(p, { method: 'PATCH', body, token }),
};
