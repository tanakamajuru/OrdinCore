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

let refreshToken: string | null = null;
export const setRefreshToken = (t: string | null) => { refreshToken = t; };

// A session's access token can expire mid-use (same class of bug fixed on the web app, 10 Nov
// 2026: staff bounced to login seconds after a legitimate session started). Rather than every
// screen's fetch failing outright on a 401, attempt one silent refresh and retry. Concurrent 401s
// share a single in-flight refresh — the refresh token is single-use/rotating, so two concurrent
// refresh attempts would present an already-rotated token and trigger the server's reuse-detection
// (which revokes every session for the user).
let refreshInFlight: Promise<{ token: string; refreshToken?: string } | null> | null = null;
// Set by AuthContext so a failed refresh can force the app back to the login screen.
let onRefreshFailed: (() => void) | null = null;
export const setOnRefreshFailed = (fn: (() => void) | null) => { onRefreshFailed = fn; };
// Set by AuthContext so a successful (rotated) refresh is persisted to secure storage, not just
// kept in memory — otherwise a cold app restart right after a silent refresh would present the
// now-revoked pre-rotation token and the server's reuse-detection would kill the whole session.
let onTokenRefreshed: ((token: string, refreshToken?: string) => void) | null = null;
export const setOnTokenRefreshed = (fn: ((token: string, refreshToken?: string) => void) | null) => { onTokenRefreshed = fn; };

async function silentRefresh(): Promise<string | null> {
  if (!refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || json?.success === false || !json?.data?.token) return null;
        const newToken: string = json.data.token;
        authToken = newToken;
        if (json.data.refreshToken) refreshToken = json.data.refreshToken;
        onTokenRefreshed?.(newToken, json.data.refreshToken);
        return { token: newToken, refreshToken: json.data.refreshToken as string | undefined };
      } catch {
        return null;
      }
    })().finally(() => { refreshInFlight = null; });
  }
  const r = await refreshInFlight;
  return r?.token ?? null;
}

type Options = { method?: string; body?: any; token?: string; signal?: AbortSignal };

// Every response from the OrdinCore API is { success, data, meta } or { success, message }.
// unwrap returns .data; request throws ApiError with the server's message on failure.
export async function request<T = any>(path: string, opts: Options = {}, isRetry = false): Promise<T> {
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
    const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
    if (res.status === 401 && !isAuthRoute && !isRetry && !opts.token) {
      const newToken = await silentRefresh();
      if (newToken) return request<T>(path, opts, true);
      onRefreshFailed?.();
    }
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
