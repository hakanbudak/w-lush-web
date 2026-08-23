// Onam formları: kliniğin şablonları ve danışanın imzaladığı kopyalar.
import { request } from './client';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface ConsentTemplate {
  id: number;
  title: string;
  body: string;
  service_name: string;
  active: boolean;
  sort_order: number;
}
export type ConsentTemplateInput = Omit<ConsentTemplate, 'id'>;

export interface ConsentSignature {
  id: number;
  phone: string;
  customer_name: string;
  title: string;
  token: string;
  signed: boolean;
  signed_name: string;
  signed_at: string | null;
  created_at: string;
}

export interface ConsentSignatureDetail extends ConsentSignature {
  body: string;
  signature: string;
}

export const listConsentTemplates = () =>
  request<ConsentTemplate[]>('/api/consent-templates');

export const createConsentTemplate = (t: ConsentTemplateInput) =>
  request<ConsentTemplate>('/api/consent-templates', {
    method: 'POST',
    body: JSON.stringify(t),
  });

export const updateConsentTemplate = (id: number, t: ConsentTemplateInput) =>
  request<ConsentTemplate>(`/api/consent-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(t),
  });

export const deleteConsentTemplate = (id: number) =>
  request<void>(`/api/consent-templates/${id}`, { method: 'DELETE' });

export const listCustomerConsents = (phone: string) =>
  request<ConsentSignature[]>(`/api/customers/${encodeURIComponent(phone)}/consents`);

export const requestConsent = (
  templateId: number,
  phone: string,
  customerName: string,
) =>
  request<ConsentSignature>('/api/consents', {
    method: 'POST',
    body: JSON.stringify({
      template_id: templateId,
      phone,
      customer_name: customerName,
    }),
  });

export const getConsentDetail = (token: string) =>
  request<ConsentSignatureDetail>(`/api/consents/${token}`);

/* ── İmza sayfası: oturum yok ───────────────────────────────── */

export interface PublicConsent {
  clinic_name: string;
  customer_name: string;
  title: string;
  body: string;
  signed: boolean;
  signed_name: string;
  signed_at: string | null;
  signature: string;
}

/**
 * `api/client.ts` yerine ayrı çağrı: oradaki `request` jeton ekliyor ve
 * 401'de oturumu kapatıyor. Formu imzalayan kişinin oturumu yok.
 */
async function ask<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => (typeof b?.detail === 'string' ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? 'Bir şeyler ters gitti. Lütfen tekrar deneyin.');
  }
  return (await res.json()) as T;
}

export const getPublicConsent = (token: string) =>
  ask<PublicConsent>(`/api/consent/${encodeURIComponent(token)}`);

export const signConsent = (token: string, signedName: string, signature: string) =>
  ask<PublicConsent>(`/api/consent/${encodeURIComponent(token)}/sign`, {
    method: 'POST',
    body: JSON.stringify({ signed_name: signedName, signature }),
  });
