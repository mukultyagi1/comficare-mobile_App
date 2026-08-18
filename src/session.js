import AsyncStorage from '@react-native-async-storage/async-storage';

// Mirrors comficare-frontend/src/api/auth.js's contract (persistSession,
// hasPermission/hasAnyPermission, etc.) so the permission-gating logic reads
// the same way on both platforms — the backend is still the real
// enforcement point (@RequirePermission guards on every route), this is
// only what decides what the UI shows.
const KEYS = {
  sessionToken: 'sessionToken',
  currentUser: 'currentUser',
  currentRole: 'currentRole',
  currentPermissions: 'currentPermissions',
};

// AsyncStorage is async, but callers all over the app (nav gating, the API
// client's Authorization header) need a synchronous read the way web's
// sessionStorage-backed getters are. This in-memory cache is the source of
// truth for those reads; loadSession() populates it once at boot and
// persistSession/clearSession keep it in sync with storage on every change.
let cache = { sessionToken: null, user: null, role: null, permissions: [] };

export async function loadSession() {
  const [sessionToken, userRaw, roleRaw, permissionsRaw] = await Promise.all([
    AsyncStorage.getItem(KEYS.sessionToken),
    AsyncStorage.getItem(KEYS.currentUser),
    AsyncStorage.getItem(KEYS.currentRole),
    AsyncStorage.getItem(KEYS.currentPermissions),
  ]);
  cache = {
    sessionToken,
    user: userRaw ? JSON.parse(userRaw) : null,
    role: roleRaw ? JSON.parse(roleRaw) : null,
    permissions: permissionsRaw ? JSON.parse(permissionsRaw) : [],
  };
  return cache;
}

export async function persistSession({ user, sessionToken, role, permissions }) {
  cache = { sessionToken, user, role: role ?? null, permissions: permissions ?? [] };
  await Promise.all([
    AsyncStorage.setItem(KEYS.sessionToken, sessionToken),
    AsyncStorage.setItem(KEYS.currentUser, JSON.stringify(user)),
    AsyncStorage.setItem(KEYS.currentRole, JSON.stringify(role ?? null)),
    AsyncStorage.setItem(KEYS.currentPermissions, JSON.stringify(permissions ?? [])),
  ]);
}

export async function clearSession() {
  cache = { sessionToken: null, user: null, role: null, permissions: [] };
  await AsyncStorage.multiRemove([KEYS.sessionToken, KEYS.currentUser, KEYS.currentRole, KEYS.currentPermissions]);
}

export function getSessionToken() {
  return cache.sessionToken;
}

export function getCurrentUser() {
  return cache.user;
}

export function getCurrentRole() {
  return cache.role;
}

export function getPermissions() {
  return cache.permissions;
}

// The single place mobile code checks access — never hardcode a role name,
// same rule as the web app (see comficare-frontend/src/api/auth.js:52-55).
export function hasPermission(code) {
  return cache.permissions.includes(code);
}

// `codes` of null/undefined means "visible to any signed-in user", matching
// the `permissions: null` convention in the web sidebar's navItems.
export function hasAnyPermission(codes) {
  if (!codes) return true;
  return codes.some((code) => cache.permissions.includes(code));
}
