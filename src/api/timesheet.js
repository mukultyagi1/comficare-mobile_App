import { apiGet, apiPost, apiPut } from '../apiClient';

// Matches comficare-backend's timesheet.controller.ts. Every edge of the
// shift lifecycle (clock-in/out, break-start/end) requires a current fix —
// see timesheet.service.ts's requireCoords — under a different field-name
// pair depending on which edge it's recording.
export const timesheetsApi = {
  list: (params) => apiGet('/timesheet', params),
  listEvents: (params) => apiGet('/timesheet/events', params),
  clockIn: (employeeId, { latitude, longitude }) =>
    apiPost('/timesheet/clock-in', { employeeId, startLatitude: latitude, startLongitude: longitude }),
  clockOut: (employeeId, { latitude, longitude }) =>
    apiPost('/timesheet/clock-out', { employeeId, endLatitude: latitude, endLongitude: longitude }),
  startBreak: (employeeId, { latitude, longitude }) =>
    apiPost('/timesheet/break-start', { employeeId, startLatitude: latitude, startLongitude: longitude }),
  endBreak: (employeeId, { latitude, longitude }) =>
    apiPost('/timesheet/break-end', { employeeId, endLatitude: latitude, endLongitude: longitude }),
  approve: (id, comments) => apiPut(`/timesheet/${id}/approve`, comments ? { comments } : undefined),
  reject: (id, comments) => apiPut(`/timesheet/${id}/reject`, comments ? { comments } : undefined),
};
