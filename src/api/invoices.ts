// Faturalar. Ürün bir e-fatura entegratörüne bağlanmıyor: fatura UBL-TR 1.2
// XML olarak üretiliyor, klinik dosyayı kendi portalına yüklüyor.
import { request } from './client';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface InvoiceLine {
  id?: number;
  name: string;
  quantity: number;
  /** Kuruş. Fatura KDV'si kuruş hassasiyeti istiyor. */
  unit_price_kurus: number;
  vat_rate: number;
  unit_code?: string;
  net_kurus?: number;
  vat_kurus?: number;
  total_kurus?: number;
}

export interface InvoiceCustomer {
  name?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  district?: string;
  phone?: string;
}

export interface Invoice {
  id: number;
  number: string;
  ettn: string;
  profile: string;
  issue_date: string;
  issue_time: string;
  customer_name: string;
  customer_tax_id: string;
  phone: string;
  note: string;
  net_kurus: number;
  vat_kurus: number;
  total_kurus: number;
  created_at: string;
}

export interface InvoiceDetail extends Invoice {
  customer_address: string;
  customer_city: string;
  customer_district: string;
  lines: Required<Pick<InvoiceLine, 'id' | 'name' | 'quantity' | 'unit_price_kurus'
    | 'vat_rate' | 'net_kurus' | 'vat_kurus' | 'total_kurus'>>[];
}

export const listInvoices = () => request<Invoice[]>('/api/invoices');

export const getInvoice = (id: number) =>
  request<InvoiceDetail>(`/api/invoices/${id}`);

export interface UninvoicedPayment {
  id: number;
  paid_at: string;
  amount: number;
  method: string;
  phone: string | null;
  customer_name: string;
  service_name: string;
}

/** Aralıktaki, henüz faturalanmamış tahsilatlar. */
export const listUninvoicedPayments = (start: string, end: string) =>
  request<UninvoicedPayment[]>(
    `/api/invoices/uninvoiced/payments?start=${start}&end=${end}`,
  );

export const createInvoice = (body: {
  lines?: InvoiceLine[];
  /** Verilirse kalemler bu tahsilatlardan kurulur ve tahsilatlar bağlanır. */
  payment_ids?: number[];
  vat_rate?: number;
  customer: InvoiceCustomer;
  profile?: string;
  note?: string;
}) =>
  request<InvoiceDetail>('/api/invoices', {
    method: 'POST',
    body: JSON.stringify({
      lines: [], payment_ids: [], vat_rate: 20,
      profile: 'EARSIVFATURA', note: '', ...body,
    }),
  });

export const deleteInvoice = (id: number) =>
  request<void>(`/api/invoices/${id}`, { method: 'DELETE' });

/**
 * XML'i indirir.
 *
 * `request` kullanılmıyor: o JSON bekliyor ve gövdeyi ayrıştırmaya
 * çalışıyor. Buradaki cevap bir dosya.
 */
export async function downloadInvoiceXml(id: number, number: string): Promise<void> {
  const token = localStorage.getItem('wl_token');
  const res = await fetch(`${BASE}/api/invoices/${id}/xml`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => (typeof b?.detail === 'string' ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? 'Fatura indirilemedi.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${number}.xml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
