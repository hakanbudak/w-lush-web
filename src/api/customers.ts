// Müşteri görünümleri — backend: app/customers/ (klinik kapsamlı, auth'lu).
import { toUtcIso } from '../utils/time';
import { request } from './client';
import type { ChatMessage } from './conversations';

/** CRM panosunun kolonları. Backend'de türetilir, yazılamaz. */
export type Stage = 'new' | 'contacted' | 'consult' | 'customer';

/** Son mesajın tazeliği. Hiç mesajı olmayan kayıtta null gelir. */
export type Warmth = 'hot' | 'warm' | 'cold';

export interface NextAppointment {
  appt_date: string; // YYYY-MM-DD
  appt_time: string; // HH:MM
  service_name: string;
}

/** CRM kartı. */
export interface CustomerSummary {
  phone: string;
  name: string; // "" olabilir — o zaman telefon gösterilir
  first_seen: string; // ISO — ilk mesaj ya da ilk randevu, hangisi önceyse
  stage: Stage;
  warmth: Warmth | null;
  last_message: string;
  last_message_at: string | null; // ISO
  next_appointment: NextAppointment | null;
}

export interface AppointmentBrief {
  id: number;
  appt_date: string;
  appt_time: string;
  service_name: string;
  status: string; // pending | confirmed | cancelled
}

export interface CustomerStats {
  appointments_total: number;
  past_sessions: number;
  cancelled: number;
  last_visit: string | null; // YYYY-MM-DD
}

/** Profil ekranının tamamı tek yanıtta. */
export interface CustomerDetail {
  phone: string;
  name: string;
  created_at: string; // ISO
  stage: Stage;
  warmth: Warmth | null;
  stats: CustomerStats;
  appointments: AppointmentBrief[];
  messages: ChatMessage[];
}

// appt_date ve last_visit bilerek toUtcIso'dan geçmez: bunlar saat içermeyen
// takvim günleri, UTC'ye çevirmek tarihi bir gün kaydırabilir.
export const listCustomers = () =>
  request<CustomerSummary[]>('/api/customers').then((rows) =>
    rows.map((r) => ({
      ...r,
      first_seen: toUtcIso(r.first_seen),
      last_message_at: r.last_message_at ? toUtcIso(r.last_message_at) : null,
    })),
  );

// Telefon yol parçası olarak gidiyor; kodlamadan geçirmek şart.
export const getCustomer = (phone: string) =>
  request<CustomerDetail>(`/api/customers/${encodeURIComponent(phone)}`).then((d) => ({
    ...d,
    created_at: toUtcIso(d.created_at),
    messages: d.messages.map((m) => ({ ...m, created_at: toUtcIso(m.created_at) })),
  }));
