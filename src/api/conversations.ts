// Operatör ↔ müşteri konuşmaları — backend: app/conversations/.
import { toUtcIso } from '../utils/time';
import { request } from './client';

/** Gelen kutusundaki bir satır. `waiting`/`handoff` backend'de türetilir. */
export interface Conversation {
  phone: string;
  customer_name: string;
  last_message: string;
  last_direction: string; // "in" (müşteri) | "out" (operatör)
  last_at: string; // ISO
  waiting: boolean; // son sözü müşteri söyledi
  handoff: boolean; // bot susmuş durumda (SILENT)
}

/** Thread'deki tek mesaj. */
export interface ChatMessage {
  id: number;
  phone: string;
  direction: string; // "in" | "out"
  body: string;
  created_at: string; // ISO
}

// Telefon yol parçası olarak gidiyor; kodlamadan geçirmek şart.
const path = (phone: string, suffix = '') =>
  `/api/conversations/${encodeURIComponent(phone)}${suffix}`;

export const listConversations = () =>
  request<Conversation[]>('/api/conversations').then((rows) =>
    rows.map((r) => ({ ...r, last_at: toUtcIso(r.last_at) })),
  );

export const getThread = (phone: string) =>
  request<ChatMessage[]>(path(phone)).then((rows) =>
    rows.map((m) => ({ ...m, created_at: toUtcIso(m.created_at) })),
  );

export const sendReply = (phone: string, message: string) =>
  request<ChatMessage>(path(phone, '/reply'), {
    method: 'POST',
    body: JSON.stringify({ message }),
  }).then((m) => ({ ...m, created_at: toUtcIso(m.created_at) }));

export const releaseToBot = (phone: string) =>
  request<{ status: string }>(path(phone, '/release'), { method: 'POST' }).then(
    () => undefined,
  );
