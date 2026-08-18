import { apiGet, apiPost } from '../apiClient';

export const authApi = {
  signIn: (email, password) => apiPost('/auth/signin', { email, password }),
  me: () => apiGet('/auth/me'),
};
