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

/**
 * Backend `created_at`'i naive UTC üretiyor (offset/`Z` yok). Eki yoksa
 * tarayıcı yerel saat varsayar ve production'da (API UTC, tarayıcı UTC+3)
 * saatler saatlerce ileri kayar. Offset yoksa `Z` ekleyip UTC'ye sabitleriz.
 */
function normalizeCreatedAt(note: AppNotification): AppNotification {
  const hasOffset = /Z$|[+-]\d{2}:\d{2}$/.test(note.created_at);
  return hasOffset ? note : { ...note, created_at: `${note.created_at}Z` };
}

/** Yeniden eskiye sıralı, backend'de 100 ile sınırlı. */
export const listNotifications = () =>
  request<AppNotification[]>('/api/notifications').then((items) =>
    items.map(normalizeCreatedAt),
  );

export async function unreadCount(): Promise<number> {
  const res = await request<{ unread: number }>('/api/notifications/unread-count');
  return res.unread;
}

export const markRead = (id: number) =>
  request<AppNotification>(`/api/notifications/${id}/read`, { method: 'POST' }).then(
    normalizeCreatedAt,
  );

export async function markAllRead(): Promise<number> {
  const res = await request<{ updated: number }>('/api/notifications/read-all', {
    method: 'POST',
  });
  return res.updated;
}
