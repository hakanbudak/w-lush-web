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
