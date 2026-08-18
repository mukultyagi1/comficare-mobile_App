import { apiGet, apiPost, apiPut } from '../apiClient';

// Matches comficare-backend's swap-request.controller.ts
// (@Controller('roster-swap-requests')).
export const swapRequestsApi = {
  list: (params) => apiGet('/roster-swap-requests', params),
  create: (body) => apiPost('/roster-swap-requests', body),
  approve: (id) => apiPut(`/roster-swap-requests/${id}/approve`),
  reject: (id) => apiPut(`/roster-swap-requests/${id}/reject`),
};
