/**
 * Tiny Fetch wrapper for the backend API.
 *
 * Auth: the server sets an HTTP-only cookie, so every request sends
 * `credentials: 'include'` — the browser handles the token; no JWT is
 * ever stored in JavaScript (no localStorage).
 *
 * Errors: the server answers with { error: "<message>" }. This helper
 * throws an Error carrying that message plus the HTTP status, so
 * pages can display it directly.
 */

// Default '' → same origin → Vite dev proxy handles /api (see vite.config.js).
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Broadcast a global event when the session is gone/expired so the
// AuthContext can drop the user and protected pages redirect.
function notifyUnauthorized() {
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const options = {
    method,
    credentials: 'include',
    headers: { Accept: 'application/json' },
  };

  if (body !== undefined) {
    if (isForm) {
      // FormData: the browser sets the multipart boundary itself.
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, options);

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* some responses have no JSON body */
  }

  if (!res.ok) {
    if (res.status === 401) notifyUnauthorized();
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, isForm = false) => request(path, { method: 'POST', body, isForm }),
  put: (path, body, isForm = false) => request(path, { method: 'PUT', body, isForm }),
  del: (path) => request(path, { method: 'DELETE' }),
};
