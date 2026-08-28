import { apiGet, apiPost } from '../apiClient';

export const authApi = {
  signIn: (email, password) => apiPost('/auth/session', { email, password }),
  me: () => apiGet('/auth/me'),
};
