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
  cancelled: boolean;
}

export const listCustomerPackages = (phone: string) =>
  request<CustomerPackage[]>(`/api/customers/${encodeURIComponent(phone)}/packages`);

export const sellPackage = (phone: string, packageId: number) =>
  request<CustomerPackage>('/api/customer-packages', {
    method: 'POST',
    body: JSON.stringify({ phone, package_id: packageId }),
  });

/** Satır silinmiyor: kullanılmış seanslar gerçekten yapıldı. */
export const cancelCustomerPackage = (id: number) =>
  request<CustomerPackage>(`/api/customer-packages/${id}`, { method: 'DELETE' });
