// Talks to the Express backend (Student 1).
// Every endpoint used by the frontend is in this one file, so if the backend
// changes a route name, only this file needs updating. See README "API contract".

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'snapshare_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

function authHeaders() {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) tokenStore.clear();
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

function toQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ---------- Auth ----------
export async function register({ username, email, password }) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: { username, email, password },
  });
  if (data.token) tokenStore.set(data.token);
  return data; // { token, user }
}

export async function login({ email, password }) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (data.token) tokenStore.set(data.token);
  return data; // { token, user }
}

export async function getCurrentUser() {
  if (!tokenStore.get()) return null;
  const data = await request('/api/auth/me');
  return data.user || data;
}

export function logout() {
  tokenStore.clear();
}

// ---------- Photos ----------
// filters: { search, userId, tag, period: 'all'|'today'|'week'|'month', sort }
// The server does the searching/filtering (SQL WHERE / ORDER BY).
export async function getPhotos(filters = {}) {
  const data = await request(`/api/photos${toQuery(filters)}`);
  return Array.isArray(data) ? data : data.photos || [];
}

export async function getPhoto(id) {
  const data = await request(`/api/photos/${id}`);
  return data.photo || data;
}

// Uses XMLHttpRequest instead of fetch so we can show an upload progress bar.
export function uploadPhoto({ file, title, description, tags = [] }, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('image', file); // field name must match multer: upload.single('image')
    form.append('title', title);
    form.append('description', description);
    form.append('tags', tags.join(',')); // e.g. "sunset,beach"

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/api/photos`);
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data.photo || data);
      else reject(new Error(data.message || data.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed: cannot reach the server.'));
    xhr.send(form);
  });
}

export async function deletePhoto(id) {
  return request(`/api/photos/${id}`, { method: 'DELETE' });
}

// ---------- Comments ----------
export async function getComments(photoId) {
  const data = await request(`/api/photos/${photoId}/comments`);
  return Array.isArray(data) ? data : data.comments || [];
}

export async function addComment(photoId, text) {
  const data = await request(`/api/photos/${photoId}/comments`, {
    method: 'POST',
    body: { text },
  });
  return data.comment || data;
}

export async function updateComment(commentId, text) {
  const data = await request(`/api/comments/${commentId}`, { method: 'PUT', body: { text } });
  return data.comment || data;
}

export async function deleteComment(commentId) {
  return request(`/api/comments/${commentId}`, { method: 'DELETE' });
}

// ---------- Tags (for the tag suggestions in the filter bar) ----------
export async function getTags() {
  const data = await request('/api/tags');
  return Array.isArray(data) ? data : data.tags || [];
}

// ---------- Users (for the "posted by" filter) ----------
export async function getUsers() {
  const data = await request('/api/users');
  return Array.isArray(data) ? data : data.users || [];
}
