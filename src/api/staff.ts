// Klinik personeli — backend: app/staff/ (klinik kapsamlı, auth'lu).
import { request } from './client';

export interface StaffMember {
  id: number;
  name: string;
  role: string;
  active: boolean;
  sort_order: number;
}

export interface StaffInput {
  name: string;
  role: string;
  active: boolean;
  sort_order: number;
}

/** Aktif + pasif hepsi; atama seçicisi pasifleri kendi eler. */
export const listStaff = () => request<StaffMember[]>('/api/staff');

export const createStaff = (input: StaffInput) =>
  request<StaffMember>('/api/staff', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateStaff = (id: number, input: StaffInput) =>
  request<StaffMember>(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteStaff = (id: number) =>
  request<void>(`/api/staff/${id}`, { method: 'DELETE' });

/** Bir uzmanın çalışmadığı gün aralığı. İki uç da dahil. */
export interface StaffLeave {
  id: number;
  staff_id: number;
  starts_on: string; // YYYY-MM-DD
  ends_on: string;
  reason: string;
}

/** İzne denk gelen randevu — operatörün taşıması gereken. */
export interface LeaveConflict {
  id: number;
  appt_date: string;
  appt_time: string;
  customer_name: string;
  phone: string;
  service_name: string;
}

export const listLeaves = (staffId: number) =>
  request<StaffLeave[]>(`/api/staff/${staffId}/leaves`);

/**
 * İzin ekler. Çakışan randevular engel değil — hastalık izni "önce
 * randevularını taşı" diye geri çevrilemez — ama cevapta dönüyor ki operatör
 * onları taşıyabilsin.
 */
export const createLeave = (
  staffId: number,
  body: { starts_on: string; ends_on: string; reason?: string },
) =>
  request<{ leave: StaffLeave; conflicts: LeaveConflict[] }>(
    `/api/staff/${staffId}/leaves`,
    { method: 'POST', body: JSON.stringify({ reason: '', ...body }) },
  );

export const deleteLeave = (leaveId: number) =>
  request<void>(`/api/staff/leaves/${leaveId}`, { method: 'DELETE' });


export interface StaffPerformance {
  staff_id: number | null;
  name: string;
  appointments: number;
  completed: number;
  cancelled: number;
  /**
   * Tarihi geçmiş ama tamamlandı işaretlenmemiş randevular. "Gelmedi"
   * DEĞİL: işaretlemenin unutulmuş olması da mümkün ve ikisini ayırt
   * edecek bir kaydımız yok.
   */
  unmarked: number;
  booked_minutes: number;
  available_minutes: number | null;
  /** Hesaplanamıyorsa null — uydurulmuş bir oran yazılmıyor. */
  occupancy: number | null;
  revenue: number;
  services: Record<string, number>;
}

export const staffPerformance = (start: string, end: string) =>
  request<StaffPerformance[]>(
    `/api/staff/performance?start=${start}&end=${end}`,
  );
