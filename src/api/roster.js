import { apiGet } from '../apiClient';

// Read-only Phase 1 — matches comficare-backend's roster.controller.ts
// (@Controller('rosters')). Drag-and-drop editing stays web-only for now.
export const rostersApi = {
  list: (params) => apiGet('/rosters', params),
  get: (id) => apiGet(`/rosters/${id}`),
};
