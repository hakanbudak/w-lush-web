// Giderler ve gider kategorileri — backend: app/expenses/.
import { toUtcIso } from '../utils/time';
import { request } from './client';
import type { MethodTotal, MonthTotal, PaymentMethod } from './payments';

// Ödeme yöntemi kümesi gelirle ortak; backend'de de tek sabitten geliyor.
export type { PaymentMethod } from './payments';

export interface ExpenseCategory {
  id: number;
  name: string;
  active: boolean;
  sort_order: number;
}

export interface CategoryInput {
  name: string;
  active: boolean;
  sort_order: number;
}

export interface Expense {
  id: number;
  category_id: number;
  category_name: string;
  spent_at: string; // YYYY-MM-DD
  amount: number; // tam sayı TRY
  method: PaymentMethod;
  description: string;
  note: string;
  created_at: string; // ISO
}

export interface ExpenseInput {
  category_id: number;
  spent_at: string;
  amount: number;
  method: PaymentMethod;
  description?: string;
  note?: string;
}

export interface CategoryTotal {
  category_id: number;
  name: string;
  amount: number;
  count: number;
}

export interface ExpenseSummary {
  total: number;
  count: number;
  by_category: CategoryTotal[];
  by_method: MethodTotal[];
  by_month: MonthTotal[];
}

const query = (start?: string, end?: string): string => {
  const p = new URLSearchParams();
  if (start) p.set('start', start);
  if (end) p.set('end', end);
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** Aktif + pasif hepsi; form pasifleri kendi eler. */
export const listCategories = () =>
  request<ExpenseCategory[]>('/api/expense-categories');

export const createCategory = (input: CategoryInput) =>
  request<ExpenseCategory>('/api/expense-categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateCategory = (id: number, input: CategoryInput) =>
  request<ExpenseCategory>(`/api/expense-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteCategory = (id: number) =>
  request<void>(`/api/expense-categories/${id}`, { method: 'DELETE' });

// spent_at takvim günü; toUtcIso'dan geçirmek tarihi kaydırabilir.
export const listExpenses = (start?: string, end?: string) =>
  request<Expense[]>(`/api/expenses${query(start, end)}`).then((rows) =>
    rows.map((e) => ({ ...e, created_at: toUtcIso(e.created_at) })),
  );

export const getExpenseSummary = (start?: string, end?: string) =>
  request<ExpenseSummary>(`/api/expenses/summary${query(start, end)}`);

export const createExpense = (input: ExpenseInput) =>
  request<Expense>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((e) => ({ ...e, created_at: toUtcIso(e.created_at) }));

export const deleteExpense = (id: number) =>
  request<void>(`/api/expenses/${id}`, { method: 'DELETE' });
