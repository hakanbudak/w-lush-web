import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerPackages from './CustomerPackages';
import type { CustomerPackage } from '../../api/packages';

vi.mock('../../api/packages', () => ({
  listCustomerPackages: vi.fn(),
  sellPackage: vi.fn(),
  cancelCustomerPackage: vi.fn(),
}));
vi.mock('../../api/clinic', () => ({ listPackages: vi.fn() }));

import { listPackages } from '../../api/clinic';
import { listCustomerPackages } from '../../api/packages';

const paket = (over: Partial<CustomerPackage> = {}): CustomerPackage => ({
  id: 1, phone: '05321112233', name: 'Lazer 10 seans',
  service_name: 'Lazer epilasyon · bölgesel', total_sessions: 10,
  used_sessions: 3, remaining: 7, price: 8000,
  sold_at: '2026-08-01T10:00:00', cancelled: false, ...over,
});

beforeEach(() => {
  vi.mocked(listPackages).mockResolvedValue([]);
  vi.mocked(listCustomerPackages).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CustomerPackages', () => {
  it('kalan seansı toplamla birlikte gösterir', async () => {
    vi.mocked(listCustomerPackages).mockResolvedValue([paket()]);
    render(<CustomerPackages phone="05321112233" />);
    expect(await screen.findByText('7 / 10 seans')).toBeTruthy();
  });

  it('iptal edilen pakette seans yerine "İptal" yazar', async () => {
    vi.mocked(listCustomerPackages).mockResolvedValue([paket({ cancelled: true })]);
    render(<CustomerPackages phone="05321112233" />);
    expect(await screen.findByText('İptal')).toBeTruthy();
  });

  it('hizmete bağlı olmayan paketin seansının otomatik düşmediğini söyler', async () => {
    vi.mocked(listCustomerPackages).mockResolvedValue([paket({ service_name: '' })]);
    render(<CustomerPackages phone="05321112233" />);
    expect(
      await screen.findByText(/Hizmete bağlı değil — seans otomatik düşmez/),
    ).toBeTruthy();
  });

  it('paket satılmamışsa bunu söyler', async () => {
    render(<CustomerPackages phone="05321112233" />);
    expect(await screen.findByText('Bu danışana henüz paket satılmamış.')).toBeTruthy();
  });

  it('tanımlı paket yokken önce Sistem ekranına yönlendirir', async () => {
    render(<CustomerPackages phone="05321112233" />);
    await waitFor(() =>
      expect(screen.getByText(/Önce Sistem ekranından paket tanımlayın/)).toBeTruthy(),
    );
  });
});
