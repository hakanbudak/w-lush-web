// w-lush-api klinik uçları. Backend şemalarıyla birebir.
import { request } from './client';

/* ── Hizmetler ── */
export interface Service {
  id: number;
  name: string;
  price: number; // TL, tam sayı
  active: boolean;
  sort_order: number;
}
export type ServiceInput = Omit<Service, 'id'>;

export const listServices = () => request<Service[]>('/api/services');

export const createService = (s: ServiceInput) =>
  request<Service>('/api/services', {
    method: 'POST',
    body: JSON.stringify(s),
  });

export const updateService = (id: number, s: ServiceInput) =>
  request<Service>(`/api/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(s),
  });

export const deleteService = (id: number) =>
  request<void>(`/api/services/${id}`, { method: 'DELETE' });

/* ── Paketler ── */
export interface Package {
  id: number;
  name: string;
  sessions: number;     // seans sayısı
  price: number;        // TL, toplam
  save_percent: number; // %avantaj
  active: boolean;
  sort_order: number;
}
export type PackageInput = Omit<Package, 'id'>;

export const listPackages = () => request<Package[]>('/api/packages');

export const createPackage = (p: PackageInput) =>
  request<Package>('/api/packages', {
    method: 'POST',
    body: JSON.stringify(p),
  });

export const updatePackage = (id: number, p: PackageInput) =>
  request<Package>(`/api/packages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(p),
  });

export const deletePackage = (id: number) =>
  request<void>(`/api/packages/${id}`, { method: 'DELETE' });

/* ── Ayarlar (çalışma saatleri / ekip iletimi) ── */
export interface ClinicSettings {
  open_days: number[];
  slot_times: string[];
  days_ahead: number;
  timezone: string;
  handoff_mode: string;
  handoff_target: string;
  [key: string]: unknown;
}

export const getSettings = () => request<ClinicSettings>('/api/settings');

export const updateSettings = (patch: Record<string, unknown>) =>
  request<ClinicSettings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });

/* ── Randevular / talepler (WhatsApp'tan gelen) ── */
export interface Appointment {
  id: number;
  phone: string;
  customer_name: string;
  service_name: string;
  appt_date: string;
  appt_time: string;
  status: string;
  created_at: string;
}
export const listAppointments = () =>
  request<Appointment[]>('/api/appointments');

export const confirmAppointment = (id: number) =>
  request<Appointment>(`/api/appointments/${id}/confirm`, { method: 'POST' });

export const cancelAppointment = (id: number) =>
  request<Appointment>(`/api/appointments/${id}/cancel`, { method: 'POST' });

export interface ClinicRequest {
  id: number;
  phone: string;
  customer_name: string;
  message: string;
  status: string;
  created_at: string;
}
export const listRequests = () => request<ClinicRequest[]>('/api/requests');
