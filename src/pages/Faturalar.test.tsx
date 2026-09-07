import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Faturalar from './Faturalar';

const getSettings = vi.fn();
vi.mock('../api/clinic', () => ({ getSettings: (...a: unknown[]) => getSettings(...a) }));
vi.mock('../api/invoices', () => ({
  listInvoices: () => Promise.resolve([]),
  createInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  downloadInvoiceXml: vi.fn(),
  listUninvoicedPayments: () => Promise.resolve([]),
}));

const TAM = {
  invoice_title: 'Deneme Ltd.', invoice_tax_id: '1234567890',
  invoice_tax_office: 'Kadıköy', invoice_address: 'Bağdat Cad. 1',
  invoice_city: 'İstanbul', invoice_prefix: 'DNM',
};

const göster = () => render(<MemoryRouter><Faturalar /></MemoryRouter>);

beforeEach(() => getSettings.mockReset().mockResolvedValue(TAM));
afterEach(cleanup);

describe('Faturalar · satıcı bilgisi ön koşulu', () => {
  it('eksik alanları baştan sayıyor', async () => {
    // Sunucu bunu zaten reddediyor, ama ancak bütün kalemler yazıldıktan
    // sonra; ekranın baştan söylemesi gerekiyor.
    getSettings.mockResolvedValue({ ...TAM, invoice_tax_id: '', invoice_city: '  ' });
    göster();
    expect(await screen.findByText(/Eksik: VKN \/ TCKN, İl\./)).toBeTruthy();
  });

  it('eksikken fatura kesme kapalı', async () => {
    getSettings.mockResolvedValue({ ...TAM, invoice_title: '' });
    göster();
    await screen.findByText(/Eksik:/);
    expect((screen.getByText('Fatura kes').closest('button') as HTMLButtonElement).disabled)
      .toBe(true);
  });

  it('eksikken tahsilat paneli de gizli', async () => {
    // Seçim yaptırıp sonunda reddetmek, düğmeyi kilitleyip bu yolu açık
    // bırakmaktan farksız olurdu.
    getSettings.mockResolvedValue({ ...TAM, invoice_prefix: '' });
    göster();
    await screen.findByText(/Eksik:/);
    expect(screen.queryByText('Faturalanmamış tahsilatlar')).toBeNull();
  });

  it('bilgiler tamken uyarı yok ve iki yol da açık', async () => {
    göster();
    expect(await screen.findByText('Faturalanmamış tahsilatlar')).toBeTruthy();
    expect(screen.queryByText(/Eksik:/)).toBeNull();
    expect((screen.getByText('Fatura kes').closest('button') as HTMLButtonElement).disabled)
      .toBe(false);
  });

  it('ayar okunamazsa olmayan bir eksik uydurmuyor', async () => {
    getSettings.mockRejectedValueOnce(new Error('ağ'));
    göster();
    expect(await screen.findByText('Faturalanmamış tahsilatlar')).toBeTruthy();
    expect(screen.queryByText(/Eksik:/)).toBeNull();
  });
});
