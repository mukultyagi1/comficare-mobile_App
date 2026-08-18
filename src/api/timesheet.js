import { apiGet, apiPost, apiPut } from '../apiClient';

// Matches comficare-backend's timesheet.controller.ts. Clock-in requires a
// current fix (startLatitude/startLongitude) — see timesheet.service.ts's
// clockIn — the rest of the shift lifecycle just needs employeeId.
export const timesheetsApi = {
  list: (params) => apiGet('/timesheet', params),
  listEvents: (params) => apiGet('/timesheet/events', params),
  clockIn: (employeeId, { latitude, longitude }) =>
    apiPost('/timesheet/clock-in', { employeeId, startLatitude: latitude, startLongitude: longitude }),
  clockOut: (employeeId) => apiPost('/timesheet/clock-out', { employeeId }),
  startBreak: (employeeId) => apiPost('/timesheet/break-start', { employeeId }),
  endBreak: (employeeId) => apiPost('/timesheet/break-end', { employeeId }),
  approve: (id, comments) => apiPut(`/timesheet/${id}/approve`, comments ? { comments } : undefined),
  reject: (id, comments) => apiPut(`/timesheet/${id}/reject`, comments ? { comments } : undefined),
};
