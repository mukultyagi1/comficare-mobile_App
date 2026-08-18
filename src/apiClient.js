import { API_BASE_URL, TENANT_ID } from './config';
import { getSessionToken } from './session';

// Mirrors comficare-frontend/src/api/client.js's response envelope
// ({ data: {...} } on success, { error: { code, details } } on failure)
// and its apiGet/apiPost/apiPut/apiDelete shape, so resource files under
// src/api/ read the same as their comficare-frontend/src/api/*.js
// counterparts.
function appendQuery(path, params) {
  if (!params) return path;
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return parts.length ? `${path}${path.includes('?') ? '&' : '?'}${parts.join('&')}` : path;
}

async function request(path, { method = 'GET', body, params } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const token = getSessionToken();

  const res = await fetch(`${API_BASE_URL}${appendQuery(path, params)}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'X-Tenant-Id': TENANT_ID,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.details || json?.error?.code || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json?.data;
}

export const apiGet = (path, params) => request(path, { method: 'GET', params });
export const apiPost = (path, body) => request(path, { method: 'POST', body });
export const apiPut = (path, body) => request(path, { method: 'PUT', body });
export const apiDelete = (path) => request(path, { method: 'DELETE' });
