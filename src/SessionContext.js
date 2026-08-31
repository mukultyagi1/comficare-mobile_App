import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { authApi } from './api/auth';
import { clearSession, loadSession, persistSession } from './session';
import { connectLocationSocket, disconnectLocationSocket, shareLocation, stopSharing } from './locationSocket';
import { LOCATION_TASK_NAME } from './backgroundLocationTask';

// React-facing wrapper around session.js: owns in-memory state so screens
// re-render on sign-in/out/permission changes, while session.js's own cache
// stays the synchronous source of truth apiClient.js reads the token from.
const SessionContext = createContext(null);

const SIGNED_OUT_STATE = { status: 'signedOut', sessionToken: null, user: null, role: null, permissions: [] };

export function SessionProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', sessionToken: null, user: null, role: null, permissions: [] });
  // 'idle' | 'requesting' | 'granted' | 'denied' | 'error:<message>' — surfaced
  // read-only on Dashboard so there's some visible signal for what would
  // otherwise be an invisible background permission request.
  const [locationStatus, setLocationStatus] = useState('idle');
  // locationStatus only reflects whether the OS *permission* was granted —
  // it's set once and never changes again. Whether the device's location
  // service (the actual GPS/Location toggle) is currently on is a separate,
  // live-changing thing, so it's tracked and polled independently — this is
  // what lets the Dashboard label (and, indirectly, whether shareLocation()
  // is even being called) actually reflect flipping that toggle off.
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const loaded = await loadSession();
      if (!loaded.sessionToken) {
        setState(SIGNED_OUT_STATE);
        return;
      }
      setState({ status: 'signedIn', ...loaded });

      // Re-fetch in the background so a permission change made server-side
      // takes effect without forcing a re-login (mirrors
      // comficare-frontend/src/api/auth.js's refreshCurrentUser).
      try {
        const fresh = await authApi.me();
        if (fresh?.user) {
          const next = {
            sessionToken: loaded.sessionToken,
            user: fresh.user,
            role: fresh.role ?? null,
            permissions: fresh.permissions ?? [],
          };
          await persistSession(next);
          setState({ status: 'signedIn', ...next });
        }
      } catch {
        // Keep the cached session on a transient failure; a real auth
        // failure (expired token) will surface on the next API call.
      }
    })();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await authApi.signIn(email, password);
    const next = { sessionToken: data.sessionToken, user: data.user, role: data.role ?? null, permissions: data.permissions ?? [] };
    await persistSession(next);
    setState({ status: 'signedIn', ...next });
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setState(SIGNED_OUT_STATE);
  }, []);

  // Re-fetches /auth/me and refreshes the cached session — used after
  // ProfileScreen updates the display name or avatar, so the change shows up
  // immediately instead of waiting for the next sign-in (mirrors
  // comficare-frontend/src/api/auth.js's refreshCurrentUser).
  const refreshUser = useCallback(async () => {
    const fresh = await authApi.me();
    if (fresh?.user) {
      const next = {
        sessionToken: state.sessionToken,
        user: fresh.user,
        role: fresh.role ?? null,
        permissions: fresh.permissions ?? [],
      };
      await persistSession(next);
      setState({ status: 'signedIn', ...next });
    }
    return fresh?.user;
  }, [state.sessionToken]);

  const hasPermission = useCallback((code) => state.permissions.includes(code), [state.permissions]);

  // codes of null/undefined means "visible to any signed-in user", matching
  // the web sidebar's navItems convention.
  const hasAnyPermission = useCallback(
    (codes) => (!codes ? true : codes.some((code) => state.permissions.includes(code))),
    [state.permissions],
  );

  // One socket for the whole app, alive for as long as a session is — the
  // location-sharing effect below emits on it, the Team Location screen
  // listens on it, independent of which screen is currently mounted.
  useEffect(() => {
    if (state.status === 'signedIn' && state.sessionToken) {
      connectLocationSocket(state.sessionToken);
      return () => disconnectLocationSocket();
    }
    return undefined;
  }, [state.status, state.sessionToken]);

  // Location sharing is automatic, not a switch the user flips — the OS's
  // own permission prompts are the only control surface, fired once right
  // after sign-in. Two permissions are requested in sequence: foreground
  // first (required — "while using app"), then background ("Always allow"),
  // which is what lets the employee keep showing Live on the web app's
  // /location page while the phone's screen is off or another app is in
  // front, for as long as this app process is still alive. If background is
  // denied, sharing falls back to foreground-only (watchPositionAsync stops
  // delivering the moment the app leaves the foreground, so the employee
  // will show Offline as soon as they switch away — not just on force-quit).
  useEffect(() => {
    if (state.status !== 'signedIn') return undefined;
    let subscription;
    let backgroundStarted = false;
    let cancelled = false;

    (async () => {
      try {
        setLocationStatus('requesting');
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (foregroundStatus !== 'granted') {
          setLocationStatus('denied');
          return;
        }

        // Background tracking needs native permission config that only
        // exists after a rebuild (app.json changes don't apply to an
        // already-installed binary) — on a build that predates that
        // rebuild, requestBackgroundPermissionsAsync/startLocationUpdatesAsync
        // can throw. That must never take down foreground sharing with it,
        // so it's isolated in its own try/catch with a plain-watch fallback.
        let backgroundGranted = false;
        try {
          const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
          if (cancelled) return;
          if (backgroundStatus === 'granted') {
            // Delivers to the TaskManager task in backgroundLocationTask.js —
            // fires in both foreground and background, so no separate
            // watchPositionAsync subscription is needed alongside it.
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 5000,
              // 0, not a real distance — this is a Live *presence* signal,
              // not a movement tracker, so it must keep pinging on the timer
              // above even while the phone sits still. A non-zero value
              // gates the callback on movement past that many meters, so a
              // stationary phone would ping once and then never again,
              // tripping the 90s staleness window into a stuck Offline.
              distanceInterval: 0,
              pausesUpdatesAutomatically: false,
              showsBackgroundLocationIndicator: true,
              foregroundService: {
                notificationTitle: 'Comficare',
                notificationBody: 'Sharing your location with your team while signed in.',
              },
            });
            if (cancelled) return;
            backgroundGranted = true;
          }
        } catch {
          // Native background support isn't in this binary yet — fall
          // through to plain foreground watching below.
        }

        if (backgroundGranted) {
          backgroundStarted = true;
          setLocationStatus('granted');
        } else {
          subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 0 },
            (position) => {
              const { latitude, longitude, accuracy } = position.coords;
              shareLocation({ latitude, longitude, accuracy: accuracy ?? undefined });
            },
          );
          if (cancelled) return;
          setLocationStatus('granted:foreground-only');
        }
      } catch (err) {
        if (!cancelled) setLocationStatus(`error:${err.message}`);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
      if (backgroundStarted) {
        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
      }
      stopSharing();
    };
  }, [state.status]);

  // Polls the device's actual Location toggle — not app permission, the OS
  // setting itself — so the Dashboard label flips the moment the employee
  // turns their phone's location off, instead of staying stuck on whatever
  // it said right after permission was granted.
  useEffect(() => {
    if (state.status !== 'signedIn') return undefined;
    let cancelled = false;
    const check = () => {
      Location.hasServicesEnabledAsync().then((enabled) => {
        if (!cancelled) setLocationServicesEnabled(enabled);
      });
    };
    check();
    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state.status]);

  const value = useMemo(
    () => ({ ...state, locationStatus, locationServicesEnabled, signIn, signOut, refreshUser, hasPermission, hasAnyPermission }),
    [state, locationStatus, locationServicesEnabled, signIn, signOut, refreshUser, hasPermission, hasAnyPermission],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
