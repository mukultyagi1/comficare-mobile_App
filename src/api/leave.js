import { apiGet, apiPost, apiPut } from '../apiClient';

// Matches comficare-backend's leave.controller.ts (@Controller('leave-management')).
// Body field is `comments`, not `reason` — see leaveRequestSchema in
// comficare-backend/src/common/validators.ts.
export const leavesApi = {
  listTypes: () => apiGet('/leave-management/leave-types'),
  listRequests: (params) => apiGet('/leave-management/requests', params),
  createRequest: ({ empId, leaveTypeId, startDate, endDate, comments }) =>
    apiPost('/leave-management/requests', { empId, leaveTypeId, startDate, endDate, comments }),
  approveRequest: (id, comments) => apiPut(`/leave-management/requests/${id}/approve`, comments ? { comments } : undefined),
  rejectRequest: (id, comments) => apiPut(`/leave-management/requests/${id}/reject`, comments ? { comments } : undefined),
  approveRequests: (ids, comments) => apiPut('/leave-management/requests/bulk/approve', { ids, ...(comments ? { comments } : {}) }),
  rejectRequests: (ids, comments) => apiPut('/leave-management/requests/bulk/reject', { ids, ...(comments ? { comments } : {}) }),
  cancelRequest: (id) => apiPut(`/leave-management/requests/${id}/cancel`),
};
