import { apiGet, apiPost, apiPut } from '../apiClient';

// Matches comficare-backend's auth.controller.ts (updateProfile/changePassword/
// updateAvatar) — same routes comficare-frontend's MyProfileSheet.jsx uses.
export const authApi = {
  signIn: (email, password) => apiPost('/auth/session', { email, password }),
  me: () => apiGet('/auth/me'),
  updateProfile: (data) => apiPut('/auth/me/profile', data),
  changePassword: (data) => apiPut('/auth/me/password', data),
  // `file` is an object shaped like { uri, name, type } — what
  // expo-image-picker's result maps to for React Native's FormData/fetch.
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiPost('/auth/me/avatar', formData);
  },
};
