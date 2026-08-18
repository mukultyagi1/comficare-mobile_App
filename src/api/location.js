import { apiGet } from '../apiClient';

// REST snapshot for the team Location list; live updates come from the
// location:update socket (see ../locationSocket.js) — matches
// comficare-backend's location.controller.ts (@Get('employees')).
export const locationApi = {
  list: () => apiGet('/location/employees'),
};
