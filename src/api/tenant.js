import { apiGet } from '../apiClient';

// Matches comficare-backend's tenant.controller.ts — @Public() so the
// sign-in page (no session yet) can show the org's own uploaded logo
// instead of a hardcoded one, same as comficare-frontend's useTenantBranding.
export const tenantApi = {
  getBranding: () => apiGet('/tenants/branding'),
};
