import * as TaskManager from 'expo-task-manager';
import { shareLocation } from './locationSocket';

// Registered here (module scope, imported once from index.js before the app
// mounts) rather than inside SessionContext — TaskManager requires the task
// to be defined synchronously on every JS load, including the headless
// relaunches iOS performs solely to deliver a background location event
// (SessionContext's component tree may not exist yet at that point).
export const LOCATION_TASK_NAME = 'comficare-background-location';

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) return;
  const location = data?.locations?.[0];
  if (!location) return;
  const { latitude, longitude, accuracy } = location.coords;
  // The socket connection made in SessionContext lives at module scope in
  // locationSocket.js, so it's reachable here regardless of what triggered
  // this callback (foreground watch, background wake, or headless relaunch).
  shareLocation({ latitude, longitude, accuracy: accuracy ?? undefined });
});
