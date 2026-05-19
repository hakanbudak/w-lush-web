// Backend (w-lush-api) ile konuşan ince fetch sarmalayıcı.
// Dev'de boş = same-origin; Vite proxy '/api' → :8000 (CORS yok).
// Prod / farklı host için VITE_API_URL ile override edilir.
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${detail || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { API_BASE };
