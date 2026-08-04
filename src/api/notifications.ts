// Operatör bildirimleri — backend: app/notifications/ (klinik kapsamlı, auth'lu).
import { request } from './client';

/** Backend'in ürettiği türler (app/notifications/service.py). */
export type NotificationKind = 'booking' | 'reschedule' | 'cancellation' | 'request';

/**
 * Tek bir bildirim. `kind` bilerek `string`: backend ileride yeni bir tür
 * eklerse arayüz çökmemeli, bilinmeyen tür varsayılan etikete düşer.
 */
export interface AppNotification {
  id: number;
  kind: string;
  message: string;
  read: boolean;
  created_at: string; // ISO
}

/** Yeniden eskiye sıralı, backend'de 100 ile sınırlı. */
export const listNotifications = () =>
  request<AppNotification[]>('/api/notifications');

export async function unreadCount(): Promise<number> {
  const res = await request<{ unread: number }>('/api/notifications/unread-count');
  return res.unread;
}

export const markRead = (id: number) =>
  request<AppNotification>(`/api/notifications/${id}/read`, { method: 'POST' });

export async function markAllRead(): Promise<number> {
  const res = await request<{ updated: number }>('/api/notifications/read-all', {
    method: 'POST',
  });
  return res.updated;
}
