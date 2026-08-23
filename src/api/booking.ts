// Herkese açık online randevu sayfası. Bu uçlar jeton istemiyor.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface BookingService {
  name: string;
  duration_minutes: number;
  price: number;
  color: string;
}

export interface BookingClinic {
  name: string;
  address: string;
  phone: string;
  open_days: number[];
  days_ahead: number;
  services: BookingService[];
}

export interface BookingResult {
  customer_name: string;
  service_name: string;
  appt_date: string;
  appt_time: string;
  status: string;
}

/**
 * `api/client.ts` yerine ayrı bir çağrı katmanı: oradaki `request` jeton
 * ekliyor ve 401'de oturumu kapatıyor. Bu sayfayı açan kişinin oturumu yok
 * ve bir hata onu hiçbir yere yönlendirmemeli.
 */
async function ask<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => (typeof b?.detail === 'string' ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? 'Bir şeyler ters gitti. Lütfen tekrar deneyin.');
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const getBookingClinic = (slug: string) =>
  ask<BookingClinic>(`/api/book/${encodeURIComponent(slug)}`);

export const getBookingSlots = (slug: string, day: string, serviceName: string) =>
  ask<{ day: string; times: string[] }>(
    `/api/book/${encodeURIComponent(slug)}/slots` +
      `?day=${day}&service_name=${encodeURIComponent(serviceName)}`,
  );

export const bookAppointment = (
  slug: string,
  body: {
    phone: string;
    customer_name: string;
    service_name: string;
    appt_date: string;
    appt_time: string;
  },
) =>
  ask<BookingResult>(`/api/book/${encodeURIComponent(slug)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
