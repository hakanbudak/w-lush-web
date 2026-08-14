import { request } from './client';

export interface CustomerHit {
  phone: string;
  name: string;
}

export interface AppointmentHit {
  id: number;
  appt_date: string;
  appt_time: string;
  phone: string;
  customer_name: string;
  service_name: string;
  status: string;
}

export interface PaymentHit {
  id: number;
  paid_at: string;
  amount: number;
  phone: string | null;
  customer_name: string;
  service_name: string;
}

export interface SearchResults {
  customers: CustomerHit[];
  appointments: AppointmentHit[];
  payments: PaymentHit[];
}

export const searchAll = (q: string) =>
  request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`);
