export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('housebalance_token');
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error('Cannot connect to the HouseBalance server. Check that the backend is running.');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : {};

  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem('housebalance_token');
      window.location.assign('/login');
    }
    throw new Error(data.error || `Request failed with status ${response.status}.`);
  }

  return data;
}
