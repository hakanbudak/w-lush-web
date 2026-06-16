// Backend (w-lush-api) ile konuşan ince fetch sarmalayıcı.
// Dev'de boş = same-origin; Vite proxy '/api' → :8000 (CORS yok).
// Prod / farklı host için VITE_API_URL ile override edilir.
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'wl_token';

// 401 olunca AuthProvider'a haber ver; default: token sil + /login
let onUnauthorized: () => void = () => {
  localStorage.removeItem(TOKEN_KEY);
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};
export const setUnauthorizedHandler = (fn: () => void): void => {
  onUnauthorized = fn;
};

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    onUnauthorized();
    throw new Error('Yetkisiz (oturum sonlanmış olabilir)');
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${detail || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { API_BASE };
