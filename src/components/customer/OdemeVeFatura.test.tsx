import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OdemeVeFatura from './OdemeVeFatura';
import type { CustomerDetail } from '../../api/customers';

const deleteInvoice = vi.fn();
const settlePromise = vi.fn();
vi.mock('../../api/invoices', () => ({
  deleteInvoice: (...a: unknown[]) => deleteInvoice(...a),
}));
vi.mock('../../api/payments', () => ({
  settlePromise: (...a: unknown[]) => settlePromise(...a),
}));

const DETAIL = {
  phone: '905321110001', name: 'Ayşe', created_at: '2026-08-01T10:00:00Z',
  stage: 'aktif', warmth: null,
  stats: {
    total_spend: 0, appointments_total: 0, past_sessions: 0,
    cancelled: 0, last_visit: null,
  },
  appointments: [], messages: [],
  invoices: [
    {
      id: 3, number: 'WLS2026000001', issue_date: '2026-09-01',
      total_kurus: 50000, profile: 'EARSIVFATURA',
    },
  ],
  promises: [
    {
      id: 9, amount: 800, due_on: '2026-09-15',
      service_name: 'Cilt bakımı', note: 'Kart sorunu', appointment_id: 7,
    },
  ],
} as unknown as CustomerDetail;

const onChanged = vi.fn();

describe('OdemeVeFatura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteInvoice.mockResolvedValue(undefined);
    settlePromise.mockResolvedValue({ id: 9 });
  });
  afterEach(cleanup);

  it('bekleyen sözü tutarı ve vadesiyle gösteriyor', () => {
    render(<OdemeVeFatura detail={DETAIL} onChanged={onChanged} />);
    expect(screen.getByText(/Cilt bakımı/)).toBeTruthy();
    expect(screen.getByText('₺ 800')).toBeTruthy();
  });

  it('tahsil edildi denince sözü kapatıyor', async () => {
    render(<OdemeVeFatura detail={DETAIL} onChanged={onChanged} />);
    fireEvent.click(screen.getByText('Tahsil edildi'));
    await waitFor(() => expect(settlePromise).toHaveBeenCalledWith(9));
    expect(onChanged).toHaveBeenCalled();
  });

  it('faturayı numarasıyla listeliyor', () => {
    render(<OdemeVeFatura detail={DETAIL} onChanged={onChanged} />);
    expect(screen.getByText('WLS2026000001')).toBeTruthy();
  });

  it('fatura iptali önce onay istiyor', () => {
    render(<OdemeVeFatura detail={DETAIL} onChanged={onChanged} />);
    fireEvent.click(screen.getByText('İptal et'));
    expect(screen.getByText('Fatura iptal edilsin mi?')).toBeTruthy();
    expect(deleteInvoice).not.toHaveBeenCalled();
  });

  it('onaylanınca faturayı siliyor', async () => {
    render(<OdemeVeFatura detail={DETAIL} onChanged={onChanged} />);
    fireEvent.click(screen.getByText('İptal et'));
    // Onay kutusundaki düğme; listedeki ile aynı metni taşıyor.
    const dugmeler = screen.getAllByText('İptal et');
    fireEvent.click(dugmeler[dugmeler.length - 1]);
    await waitFor(() => expect(deleteInvoice).toHaveBeenCalledWith(3));
  });

  it('vazgeçilince fatura duruyor', () => {
    render(<OdemeVeFatura detail={DETAIL} onChanged={onChanged} />);
    fireEvent.click(screen.getByText('İptal et'));
    fireEvent.click(screen.getByText('Vazgeç'));
    expect(deleteInvoice).not.toHaveBeenCalled();
  });

  it('sunucunun hatasını gösteriyor', async () => {
    settlePromise.mockRejectedValueOnce(new Error('Ödeme sözü bulunamadı.'));
    render(<OdemeVeFatura detail={DETAIL} onChanged={onChanged} />);
    fireEvent.click(screen.getByText('Tahsil edildi'));
    expect(await screen.findByText(/bulunamadı/)).toBeTruthy();
  });

  it('boşken ikisini de açıkça söylüyor', () => {
    render(
      <OdemeVeFatura
        detail={{ ...DETAIL, invoices: [], promises: [] }}
        onChanged={onChanged}
      />,
    );
    expect(screen.getByText('Bekleyen ödeme sözü yok.')).toBeTruthy();
    expect(screen.getByText('Kesilmiş fatura yok.')).toBeTruthy();
  });
});
