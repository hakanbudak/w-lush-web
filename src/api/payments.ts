// Ödemeler / gelir — backend: app/payments/ (klinik kapsamlı, auth'lu).
import { toUtcIso } from '../utils/time';
import { request } from './client';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

/** Tek ödeme kaydı. */
export interface Payment {
  id: number;
  paid_at: string; // YYYY-MM-DD (takvim günü)
  amount: number; // tam sayı TRY
  method: PaymentMethod;
  phone: string | null;
  appointment_id: number | null;
  customer_name: string;
  service_name: string;
  note: string;
  created_at: string; // ISO
}

/** Yeni ödeme gövdesi. Boş bırakılan alanlar randevudan doldurulur. */
export interface PaymentInput {
  paid_at: string;
  amount: number;
  method: PaymentMethod;
  phone?: string | null;
  appointment_id?: number | null;
  customer_name?: string;
  service_name?: string;
  note?: string;
}

export interface ServiceTotal {
  service_name: string;
  amount: number;
  count: number;
}

export interface MethodTotal {
  method: PaymentMethod;
  amount: number;
  count: number;
}

export interface MonthTotal {
  month: string; // YYYY-MM
  amount: number;
}

export interface PaymentSummary {
  total: number;
  count: number;
  by_service: ServiceTotal[];
  by_method: MethodTotal[];
  by_month: MonthTotal[];
}

const query = (start?: string, end?: string): string => {
  const p = new URLSearchParams();
  if (start) p.set('start', start);
  if (end) p.set('end', end);
  const s = p.toString();
  return s ? `?${s}` : '';
};

// paid_at bir takvim günü; toUtcIso'dan geçirmek tarihi kaydırabilir.
// created_at ise zaman damgası, o normalize edilir.
export const listPayments = (start?: string, end?: string) =>
  request<Payment[]>(`/api/payments${query(start, end)}`).then((rows) =>
    rows.map((p) => ({ ...p, created_at: toUtcIso(p.created_at) })),
  );

export const getSummary = (start?: string, end?: string) =>
  request<PaymentSummary>(`/api/payments/summary${query(start, end)}`);

export const createPayment = (input: PaymentInput) =>
  request<Payment>('/api/payments', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((p) => ({ ...p, created_at: toUtcIso(p.created_at) }));

export const deletePayment = (id: number) =>
  request<void>(`/api/payments/${id}`, { method: 'DELETE' });
