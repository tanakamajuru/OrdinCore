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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
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
