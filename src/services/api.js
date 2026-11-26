const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1').replace(/\/$/, '');
const PANCHAYAT_ID = import.meta.env.VITE_PANCHAYAT_ID || sessionStorage.getItem('gramVikasPanchayatId') || '';

export const isApiConfigured = Boolean(import.meta.env.VITE_API_BASE_URL);

/** Small JSON API client. Keep transport details here so page components stay backend-agnostic. */
export async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem('gramVikasAuthToken');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(PANCHAYAT_ID ? { 'X-Panchayat-ID': PANCHAYAT_ID } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `Request failed (${response.status})`);
  return payload?.success === true && Object.hasOwn(payload, 'data') ? payload.data : payload;
}

export async function createGrievance(input) {
  return apiRequest('/grievances', { method: 'POST', body: JSON.stringify(input) });
}

export async function createPublicSuggestion(input) {
  return apiRequest('/gram-sabha/suggestions', { method: 'POST', body: JSON.stringify(input) });
}

export async function submitParticipationPoll(input) {
  return apiRequest('/gram-sabha/polls/responses', { method: 'POST', body: JSON.stringify(input) });
}

export async function fetchDashboard(panchayatId) {
  return apiRequest(`/panchayats/${encodeURIComponent(panchayatId)}/dashboard`);
}

export async function fetchGrievances(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/grievances${query ? `?${query}` : ''}`);
}

export async function fetchProjects(params = {}) {
  if (!PANCHAYAT_ID) throw new Error('Set VITE_PANCHAYAT_ID to load Panchayat-scoped projects.');
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/projects${query ? `?${query}` : ''}`);
}

export async function fetchAssets(params = {}) {
  if (!PANCHAYAT_ID) throw new Error('Set VITE_PANCHAYAT_ID to load Panchayat-scoped assets.');
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/infrastructure/assets${query ? `?${query}` : ''}`);
}

export async function fetchSchemes(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/schemes${query ? `?${query}` : ''}`);
}

export async function fetchGramSabha() {
  return apiRequest('/gram-sabha');
}
