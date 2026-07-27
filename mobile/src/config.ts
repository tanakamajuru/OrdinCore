import Constants from 'expo-constants';

// Base URL of the existing OrdinCore REST API. Override per build in app.json → extra.apiBaseUrl,
// or with EXPO_PUBLIC_API_BASE_URL at build time. No trailing slash.
const fromExtra = (Constants.expoConfig?.extra as any)?.apiBaseUrl as string | undefined;
const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = (fromEnv || fromExtra || 'https://work.ordincore.co.uk/api/v1').replace(/\/$/, '');

// The socket.io server is attached to the same host as the API (nginx proxies the upgrade),
// so the WS base is the API URL without the /api/v1 suffix — matching the web client.
export const WS_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

// The mobile client surfaces the doctrine; the API enforces it. Keep this in sync with the
// backend promotion gate (config/governance.constants.ts) for display only.
export const PROMOTION_THRESHOLD = 3;
