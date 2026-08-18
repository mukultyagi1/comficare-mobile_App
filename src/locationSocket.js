import { io } from 'socket.io-client';
import { WS_BASE_URL } from './config';

// Mirrors comficare-backend's LocationGateway contract (src/location/location.gateway.ts):
// connect to the /location namespace with the session token in the `auth`
// payload (sockets can't set arbitrary headers), then emit location:share /
// location:stop. The gateway upserts EmployeeLocation and broadcasts
// location:update to every connected web client watching the Location page.
//
// Connection lifecycle lives in SessionContext (connect once the user is
// signed in, disconnect on sign-out) rather than any one screen, so both
// MyLocationScreen (emits share/stop) and the Team Location screen (listens
// for location:update) share the same socket regardless of which is
// mounted.
let socket = null;
const updateListeners = new Set();

export function connectLocationSocket(token) {
  socket = io(`${WS_BASE_URL}/location`, {
    auth: { token },
    autoConnect: true,
  });
  socket.on('location:update', (payload) => {
    updateListeners.forEach((listener) => listener(payload));
  });
  return socket;
}

export function onLocationUpdate(listener) {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

export function shareLocation({ latitude, longitude, accuracy }) {
  socket?.emit('location:share', { latitude, longitude, accuracy });
}

export function stopSharing() {
  socket?.emit('location:stop');
}

export function disconnectLocationSocket() {
  socket?.close();
  socket = null;
  updateListeners.clear();
}
