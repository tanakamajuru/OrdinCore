import axios, { AxiosResponse, AxiosError } from 'axios';

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// VAPT F8 (26 Oct 2026): a client-supplied absolute URL (e.g. passed straight through from an
// attachment's file_url) is still honoured by axios over baseURL, so this interceptor used to
// attach the live bearer token to ANY request, including one aimed at an attacker-controlled
// host. The primary fix is server-side (incidents.service.ts now only ever stores a validated
// same-app path), but the token is only ever meant to leave the browser for this app's own API,
// so this is defence in depth: never attach it to a request resolving to a different origin.
const apiOrigin = (() => {
  try { return new URL(apiClient.defaults.baseURL || '', window.location.origin).origin; }
  catch { return window.location.origin; }
})();

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      let sameOrigin = true;
      try { sameOrigin = new URL(config.url || '', apiOrigin).origin === apiOrigin; } catch { sameOrigin = true; }
      if (sameOrigin) config.headers.Authorization = `Bearer ${token}`;
      else delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API error handler
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default apiClient;
