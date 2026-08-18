import { apiGet } from '../apiClient';

// Read-only Phase 1 — matches comficare-frontend's Department/Position/
// Employee/Job Category list endpoints (GET /departments, /positions,
// /employees, /jobs). Create/edit/delete stay web-only for now.
export const departmentsApi = {
  list: (params) => apiGet('/departments', params),
  get: (id) => apiGet(`/departments/${id}`),
};

export const positionsApi = {
  list: (params) => apiGet('/positions', params),
  get: (id) => apiGet(`/positions/${id}`),
};

export const employeesApi = {
  list: (params) => apiGet('/employees', params),
  get: (id) => apiGet(`/employees/${id}`),
};

export const designationsApi = {
  list: (params) => apiGet('/jobs', params),
  get: (id) => apiGet(`/jobs/${id}`),
};
