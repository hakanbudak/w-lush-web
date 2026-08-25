// Danışana satılan paketler ve seans sayacı.
import { request } from './client';

export interface CustomerPackage {
  id: number;
  phone: string;
  name: string;
  /** Paketin kapsadığı hizmet. Boşsa seans otomatik düşmüyor. */
  service_name: string;
  total_sessions: number;
  used_sessions: number;
  remaining: number;
  price: number;
  sold_at: string; // ISO
  /** Satışın takvim günü, kliniğin saat diliminde. */
  sold_on: string;
  /** Bu satışın yazdığı tahsilat; null ise para kaydı yok. */
  payment_id: number | null;
  cancelled: boolean;
}

export const listCustomerPackages = (phone: string) =>
  request<CustomerPackage[]>(`/api/customers/${encodeURIComponent(phone)}/packages`);

export const sellPackage = (
  phone: string,
  packageId: number,
  opts: {
    customerName?: string;
    /** Verilirse tahsilat gelire yazılır — satışla aynı işlemde. */
    money?: { amount: number; method?: string; note?: string } | null;
  } = {},
) =>
  request<CustomerPackage>('/api/customer-packages', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      package_id: packageId,
      customer_name: opts.customerName ?? '',
      money: opts.money ?? null,
    }),
  });

/** Satır silinmiyor: kullanılmış seanslar gerçekten yapıldı. */
export const cancelCustomerPackage = (id: number) =>
  request<CustomerPackage>(`/api/customer-packages/${id}`, { method: 'DELETE' });
