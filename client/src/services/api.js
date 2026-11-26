const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'pothole.token';
const REFRESH_KEY = 'pothole.refresh';

const makeStore = (key) => ({
  get() {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(val) {
    try { val ? localStorage.setItem(key, val) : localStorage.removeItem(key); } catch { /* ignore */ }
  },
});

export const tokenStore = makeStore(TOKEN_KEY);
export const refreshStore = makeStore(REFRESH_KEY);

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let inflightRefresh = null;

async function tryRefresh() {
  const rt = refreshStore.get();
  if (!rt) return false;
  if (!inflightRefresh) {
    inflightRefresh = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) throw new Error('refresh failed');
        const data = await res.json();
        tokenStore.set(data.token);
        refreshStore.set(data.refreshToken);
        return true;
      } catch {
        tokenStore.set(null);
        refreshStore.set(null);
        return false;
      } finally {
        inflightRefresh = null;
      }
    })();
  }
  return inflightRefresh;
}

const SKIP_REFRESH = new Set(['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password']);

/** Calls the API. Pass `body` for JSON or `form` (FormData) for uploads. Automatically refreshes expired access tokens once. */
export async function api(path, { method = 'GET', body, form } = {}) {
  const send = async () => {
    const headers = {};
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(`${BASE}${path}`, { method, headers, body: form ?? (body && JSON.stringify(body)) });
  };

  let res;
  try {
    res = await send();
    if (res.status === 401 && !SKIP_REFRESH.has(path) && (await tryRefresh())) {
      res = await send();
    }
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is it running?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.details);
  return data;
}
