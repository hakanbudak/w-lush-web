import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import { listCustomerPackages, sellPackage } from '../../api/packages';

const paket = (over: Partial<CustomerPackage> = {}): CustomerPackage => ({
  id: 1, phone: '05321112233', name: 'Lazer 10 seans',
  service_name: 'Lazer epilasyon · bölgesel', total_sessions: 10,
  used_sessions: 3, remaining: 7, price: 8000,
  sold_at: '2026-08-01T10:00:00', sold_on: '2026-08-01',
  payment_id: 5, cancelled: false, ...over,
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

describe('CustomerPackages · tahsilat', () => {
  const katalog = [{
    id: 3, name: 'Lazer 10 seans', sessions: 10, service_name: 'Lazer',
    price: 8000, save_percent: 0, active: true, sort_order: 0,
  }];

  /**
   * Katalog gelmeden listeyi açmak boş bir liste açıyor: Select o hâlde
   * "Tanımlı paket yok" yer tutucusuyla kapalı duruyor. Önce yer tutucunun
   * değiştiğini bekliyoruz.
   */
  const listeyiAc = async () => {
    await screen.findByText('Paket seçin');
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.mouseDown(await screen.findByText(/Lazer 10 seans/));
  };

  it('tahsilatı paketin fiyatından önerir ve satışla birlikte gönderir', async () => {
    vi.mocked(listPackages).mockResolvedValue(katalog);
    vi.mocked(sellPackage).mockResolvedValue(paket({ payment_id: 9 }));
    render(<CustomerPackages phone="05321112233" customerName="Ayşe" />);

    await listeyiAc();
    expect((await screen.findByDisplayValue('8000')).tagName).toBe('INPUT');

    fireEvent.click(screen.getByText('Paket sat'));
    await waitFor(() =>
      expect(vi.mocked(sellPackage).mock.calls[0][2]).toEqual({
        customerName: 'Ayşe',
        money: { amount: 8000, method: 'cash' },
      }),
    );
  });

  it('tahsilat kapatılınca satış paraya dokunmuyor', async () => {
    vi.mocked(listPackages).mockResolvedValue(katalog);
    vi.mocked(sellPackage).mockResolvedValue(paket({ payment_id: null }));
    render(<CustomerPackages phone="05321112233" />);

    await listeyiAc();
    fireEvent.click(screen.getByLabelText('Tahsilatı gelire yaz'));
    fireEvent.click(screen.getByText('Paket sat'));

    await waitFor(() =>
      expect(vi.mocked(sellPackage).mock.calls[0][2]?.money).toBeNull(),
    );
  });

  it('tahsilatı girilmemiş paketi işaretler', async () => {
    vi.mocked(listCustomerPackages).mockResolvedValue([paket({ payment_id: null })]);
    render(<CustomerPackages phone="05321112233" />);
    expect(await screen.findByText(/tahsilat girilmedi/)).toBeTruthy();
  });
});
