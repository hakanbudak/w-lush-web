import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TahsilattanKes from './TahsilattanKes';
import type { UninvoicedPayment } from '../../api/invoices';

const listUninvoicedPayments = vi.fn();
const createInvoice = vi.fn();
vi.mock('../../api/invoices', () => ({
  listUninvoicedPayments: (...a: unknown[]) => listUninvoicedPayments(...a),
  createInvoice: (...a: unknown[]) => createInvoice(...a),
}));

const odeme = (over: Partial<UninvoicedPayment> = {}): UninvoicedPayment => ({
  id: 1, paid_at: '2026-09-05', amount: 500, method: 'cash',
  phone: '05321112233', customer_name: 'Ayşe Yılmaz',
  service_name: 'Saç kesimi', ...over,
});

const AYSE_2 = odeme({ id: 2, amount: 300, service_name: 'Manikür' });
const MEHMET = odeme({
  id: 3, amount: 700, phone: '05339998877', customer_name: 'Mehmet Can',
});

beforeEach(() => {
  listUninvoicedPayments.mockReset().mockResolvedValue([odeme(), AYSE_2, MEHMET]);
  createInvoice.mockReset().mockImplementation(() =>
    Promise.resolve({ id: 1, number: 'DNM2026000000001', total_kurus: 50000 }),
  );
});
afterEach(cleanup);

const göster = () => render(<TahsilattanKes onCreated={() => {}} />);
const hepsiniSec = async () => fireEvent.click(await screen.findByText('Hepsini seç'));

describe('TahsilattanKes', () => {
  it('hepsini seç bütün satırları işaretliyor', async () => {
    göster();
    await hepsiniSec();
    expect(await screen.findByText(/3 tahsilat/)).toBeTruthy();
  });

  it('birden çok danışan varsa kaç fatura kesileceğini söylüyor', async () => {
    göster();
    await hepsiniSec();
    expect(screen.getByText(/2 danışan, 2 ayrı fatura/)).toBeTruthy();
    expect(screen.getByText('2 fatura kes')).toBeTruthy();
  });

  it('her danışan için ayrı fatura kesiyor', async () => {
    // Ayşe'nin faturasına Mehmet'in hizmeti yazılmamalı.
    göster();
    await hepsiniSec();
    fireEvent.click(screen.getByText('2 fatura kes'));

    await waitFor(() => expect(createInvoice).toHaveBeenCalledTimes(2));
    const cagrilar = createInvoice.mock.calls.map((c) => c[0]);
    expect(cagrilar.find((c) => c.customer.name === 'Ayşe Yılmaz').payment_ids)
      .toEqual([1, 2]);
    expect(cagrilar.find((c) => c.customer.name === 'Mehmet Can').payment_ids)
      .toEqual([3]);
  });

  it('tek danışanın iki tahsilatı tek faturada birleşiyor', async () => {
    listUninvoicedPayments.mockResolvedValue([odeme(), AYSE_2]);
    göster();
    await hepsiniSec();
    expect(screen.getByText('Fatura kes')).toBeTruthy();

    fireEvent.click(screen.getByText('Fatura kes'));
    await waitFor(() => expect(createInvoice).toHaveBeenCalledTimes(1));
    expect(createInvoice.mock.calls[0][0].payment_ids).toEqual([1, 2]);
  });

  it('bir kısmı kesilirse kaçının kesildiğini söylüyor', async () => {
    // Yoksa operatör hepsini yeniden dener ve mükerrer fatura çıkar.
    createInvoice
      .mockResolvedValueOnce({ id: 1, number: 'DNM0001', total_kurus: 50000 })
      .mockRejectedValueOnce(new Error('Fatura numarası çakıştı.'));
    göster();
    await hepsiniSec();
    fireEvent.click(screen.getByText('2 fatura kes'));

    expect(await screen.findByText(/1 fatura kesildi \(DNM0001\)/)).toBeTruthy();
    expect(screen.getByText(/1 tanesi kesilemedi/)).toBeTruthy();
  });
});
