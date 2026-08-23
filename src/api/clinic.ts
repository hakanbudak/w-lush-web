// w-lush-api klinik uçları. Backend şemalarıyla birebir.
import { request } from './client';

/* ── Hizmetler ── */
export interface Service {
  id: number;
  name: string;
  price: number; // TL, tam sayı
  /** Hizmetin süresi. Izgara saat başı olduğu için planlamayı etkilemiyor. */
  duration_minutes: number;
  active: boolean;
  sort_order: number;
  /** Takvim bloğunun rengi (#RRGGBB). */
  color: string;
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
  /** Paketin kapsadığı hizmet. Boşsa seans otomatik düşmüyor. */
  service_name: string;
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
  /** Online randevu sayfası açık mı. */
  online_booking?: boolean;
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
  staff_id: number | null;
  staff_name: string; // atanmamışsa ""
  status: string;
  created_at: string;
}
// Aralık verilmezse backend eski davranışını korur (tüm randevular, yeniden eskiye).
export const listAppointments = (start?: string, end?: string) => {
  const p = new URLSearchParams();
  if (start) p.set('start', start);
  if (end) p.set('end', end);
  const q = p.toString();
  return request<Appointment[]>(`/api/appointments${q ? `?${q}` : ''}`);
};

export const confirmAppointment = (id: number) =>
  request<Appointment>(`/api/appointments/${id}/confirm`, { method: 'POST' });

/** Randevuyu tamamlandı işaretler; danışanın paketi varsa seans düşer. */
export const completeAppointment = (id: number) =>
  request<Appointment>(`/api/appointments/${id}/complete`, { method: 'POST' });

export const cancelAppointment = (id: number) =>
  request<Appointment>(`/api/appointments/${id}/cancel`, { method: 'POST' });

export interface NewAppointment {
  phone: string;
  customer_name: string;
  service_name: string;
  appt_date: string; // YYYY-MM-DD
  appt_time: string; // HH:MM — kliniğin slot_times listesinden olmalı
  staff_id: number | null;
  notify: boolean;
}

// Randevu ile bildirim sonucu ayrı: gönderim başarısız olsa da randevu gerçek.
export interface AppointmentCreated {
  appointment: Appointment;
  notified: boolean;
  notify_error: string | null;
}

export const createAppointment = (input: NewAppointment) =>
  request<AppointmentCreated>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(input),
  });

// Atama ucu randevuyu değiştirdiği için /api/appointments altında yaşıyor.
export const assignAppointmentStaff = (id: number, staffId: number | null) =>
  request<Appointment>(`/api/appointments/${id}/staff`, {
    method: 'PUT',
    body: JSON.stringify({ staff_id: staffId }),
  });

/**
 * Randevuyu başka bir güne/saate taşır.
 *
 * `keep_staff` varsayılan: uzman randevuyla birlikte gider. `notify: false`
 * danışana mesaj göndermez — telefonda konuşuluyorsa ikinci bildirim gürültü.
 */
export const rescheduleAppointment = (
  id: number,
  body: {
    appt_date: string;
    appt_time: string;
    staff_id?: number | null;
    keep_staff?: boolean;
    notify?: boolean;
  },
) =>
  request<Appointment>(`/api/appointments/${id}/reschedule`, {
    method: 'PUT',
    body: JSON.stringify({ keep_staff: true, notify: true, ...body }),
  });

export interface ClinicRequest {
  id: number;
  phone: string;
  customer_name: string;
  message: string;
  status: string;
  created_at: string;
}
export const listRequests = () => request<ClinicRequest[]>('/api/requests');

/* ── Kurulum sihirbazı ── */
export interface PresetService {
  name: string;
  duration_minutes: number;
  color: string;
  /** Sihirbazda seçili başlayan, neredeyse her merkezde bulunan hizmet. */
  common: boolean;
}

export interface PresetGroup {
  name: string;
  color: string;
  services: PresetService[];
}

/**
 * Sihirbazın sunduğu hizmet kataloğu. Merkez tipi diye bir seçim yok — ürün
 * güzellik ve estetik merkezleri için. Katalog kapalı değil: merkez kendi
 * hizmetini de yazabiliyor.
 */
export interface Preset {
  groups: PresetGroup[];
  /** Grupların toplamı; grup umursamayan yerler için. */
  services: PresetService[];
}

/** Başlangıç hizmet listesi. Giriş gerektirmez. */
export const listPresets = () => request<Preset>('/api/setup/presets');

export interface SetupService {
  name: string;
  /** Boş bırakılırsa sunucu katalogdan tamamlıyor. */
  duration_minutes?: number;
  color?: string;
}

export interface SetupInput {
  services: SetupService[];
  open_days: number[];
  slot_times: string[];
  slot_interval_minutes: number;
}

/** Sihirbazı bitirir: demo veriyi kliniğin kendi seçimiyle değiştirir. */
export const applySetup = (input: SetupInput) =>
  request<void>('/api/setup', { method: 'POST', body: JSON.stringify(input) });
