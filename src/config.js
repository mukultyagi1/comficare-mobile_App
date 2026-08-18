import Constants from 'expo-constants';

// Same tenant as comficare-frontend/.env (VITE_TENANT_ID) — this app talks to
// the same backend/tenant as the web app, so location shared here shows up
// on the web Location page immediately.
export const TENANT_ID = 'b140fe5c-dffe-4802-9a72-94a5bcc595bb';

const BACKEND_PORT = 3002;

// Expo Go / a dev-client on a phone can't reach "localhost" — that resolves
// to the phone itself, not this computer. The Metro bundler already knows
// the LAN IP it's serving from (hostUri, e.g. "192.168.1.23:8081"); reuse
// that IP with the backend's port instead of requiring the IP be hardcoded
// or configured by hand. Falls back to localhost for the web target, where
// "localhost" correctly means this machine.
function resolveHost() {
  const hostUri =
    Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  return 'localhost';
}

const HOST = resolveHost();

// When running through a tunnel (see scripts/start-demo.js), Metro's own
// hostUri points at the *Metro* tunnel, not the backend — the backend gets
// its own separate tunnel URL, injected here via an EXPO_PUBLIC_ env var
// (inlined at bundle time by Expo) instead of being derived from HOST.
const TUNNEL_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const API_BASE_URL = TUNNEL_BACKEND_URL ? `${TUNNEL_BACKEND_URL}/api` : `http://${HOST}:${BACKEND_PORT}/api`;
export const WS_BASE_URL = TUNNEL_BACKEND_URL || `http://${HOST}:${BACKEND_PORT}`;
