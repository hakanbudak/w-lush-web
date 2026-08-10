// AI raporları — backend: app/reports/ (klinik kapsamlı, auth'lu).
import { toUtcIso } from '../utils/time';
import { request } from './client';

/** Modele gönderilen ve raporla birlikte saklanan sayılar. */
export interface ReportFacts {
  period: { start: string; end: string };
  income: {
    total: number;
    count: number;
    by_service: { name: string; amount: number }[];
  };
  expense: {
    total: number;
    count: number;
    by_category: { name: string; amount: number }[];
  };
  profit: number;
}

/** Listedeki bir satır — gövde ve facts dahil değil. */
export interface ReportSummary {
  id: number;
  kind: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;
  model: string;
  created_at: string; // ISO
}

export interface ReportDetail extends ReportSummary {
  body: string;
  facts: ReportFacts;
}

// period_* takvim günü; yalnız created_at zaman damgası normalize edilir.
const normalize = <T extends { created_at: string }>(r: T): T => ({
  ...r,
  created_at: toUtcIso(r.created_at),
});

export const listReports = () =>
  request<ReportSummary[]>('/api/reports').then((rows) => rows.map(normalize));

export const getReport = (id: number) =>
  request<ReportDetail>(`/api/reports/${id}`).then(normalize);

export const generateIncomeExpenseReport = (start: string, end: string) =>
  request<ReportDetail>('/api/reports/income-expense', {
    method: 'POST',
    body: JSON.stringify({ start, end }),
  }).then(normalize);

export const deleteReport = (id: number) =>
  request<void>(`/api/reports/${id}`, { method: 'DELETE' });
