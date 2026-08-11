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

/**
 * Durum kodu okunabilen hata. Randevu formu 409 (slot dolu) ile 422'yi
 * (slot tanımsız) ayırt etmek zorunda; metin eşleştirmesiyle yapılamaz.
 *
 * `message` biçimi bilerek değiştirilmedi — mevcut ekranlar hata metnini
 * `e.message.split('detail":"')` ile ayıklıyor ve çalışmaya devam etmeli.
 */
export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

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
    const body = await res.text().catch(() => '');
    let detail = '';
    try {
      detail = (JSON.parse(body) as { detail?: string }).detail ?? '';
    } catch {
      detail = '';
    }
    throw new ApiError(res.status, detail, `API ${res.status}: ${body || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { API_BASE };
