// WhatsApp bağlantı durumu (Model A — manuel/yönetici atamalı).
// Backend sözleşmesi: docs/whatsapp-baglanti-api.md
import { request } from './client';

export type WaStatus = 'none' | 'requested' | 'connected';

export interface WaConnection {
  status: WaStatus;
  phone_number_id: string | null;
  display_number: string | null; // görünen no, ör. "+90 5xx xxx xx xx"
  requested_at: string | null; // ISO
  connected_at: string | null; // ISO
  /** Kliniğin talepte yazdıkları — kendisine geri gösteriliyor. */
  note: string | null;
  /** Numara şu an WhatsApp'ta kullanılıyor mu. null = sorulmamış. */
  number_in_use: boolean | null;
}

const EMPTY: WaConnection = {
  status: 'none',
  phone_number_id: null,
  display_number: null,
  requested_at: null,
  connected_at: null,
  note: null,
  number_in_use: null,
};

// Backend bu uçları henüz uygulamadıysa 'none' olarak düşeriz; kart yine render olur.
export async function getConnection(): Promise<WaConnection> {
  try {
    return await request<WaConnection>('/api/whatsapp/connection');
  } catch {
    return EMPTY;
  }
}

export const requestConnection = (body?: {
  desired_number?: string;
  note?: string;
  number_in_use?: boolean | null;
}) =>
  request<WaConnection>('/api/whatsapp/request', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });

// --- Yönetici (is_admin) uçları ---

export interface AdminClinic {
  id: number;
  name: string;
  slug: string;
  whatsapp: WaConnection;
}

export const getAdminClinics = () =>
  request<AdminClinic[]>('/api/admin/clinics');

export const assignWhatsapp = (
  clinicId: number,
  body: { phone_number_id: string; display_number?: string },
) =>
  request<WaConnection>(`/api/admin/clinics/${clinicId}/whatsapp`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
