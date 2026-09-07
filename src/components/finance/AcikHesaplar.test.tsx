import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AcikHesaplar from './AcikHesaplar';

const listUnpaidAppointments = vi.fn();
vi.mock('../../api/clinic', () => ({
  listUnpaidAppointments: (...a: unknown[]) => listUnpaidAppointments(...a),
  listServices: () =>
    Promise.resolve([{ id: 1, name: 'Saç kesimi', price: 500, active: true }]),
}));

const createPayment = vi.fn();
const deletePayment = vi.fn();
vi.mock('../../api/payments', () => ({
  createPayment: (...a: unknown[]) => createPayment(...a),
  deletePayment: (...a: unknown[]) => deletePayment(...a),
}));

const randevu = (over = {}) => ({
  id: 7, phone: '05321112233', customer_name: 'Ayşe Yılmaz',
  service_name: 'Saç kesimi', appt_date: '2026-09-05', appt_time: '10:00',
  status: 'completed', staff_id: null, staff_name: '',
  created_at: '2026-09-05T09:00:00', ...over,
});

beforeEach(() => {
  listUnpaidAppointments.mockReset().mockResolvedValue([randevu()]);
  createPayment.mockReset().mockResolvedValue({ id: 1 });
  deletePayment.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('AcikHesaplar', () => {
  it('açık seansı hizmetin fiyatıyla listeliyor', async () => {
    render(<AcikHesaplar onPaid={() => {}} />);
    expect(await screen.findByText(/Ayşe Yılmaz/)).toBeTruthy();
    expect(screen.getByDisplayValue('500')).toBeTruthy();
  });

  it('hiç açık hesap yoksa panel hiç çizilmiyor', async () => {
    listUnpaidAppointments.mockResolvedValue([]);
    const { container } = render(<AcikHesaplar onPaid={() => {}} />);
    await waitFor(() => expect(container.textContent).toBe(''));
  });

  it('tahsil edince ödemeyi randevuya bağlıyor', async () => {
    const onPaid = vi.fn();
    render(<AcikHesaplar onPaid={onPaid} />);
    fireEvent.click(await screen.findByText('Tahsil et'));
    // Tek tık artık yazmıyor; önce onay soruluyor.
    expect(createPayment).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Tahsilatı kaydet'));

    await waitFor(() =>
      expect(createPayment.mock.calls[0][0]).toMatchObject({
        amount: 500, appointment_id: 7, phone: '05321112233',
        service_name: 'Saç kesimi',
      }),
    );
    await waitFor(() => expect(onPaid).toHaveBeenCalled());
  });

  it('tahsil edilen satır listeden çıkıyor', async () => {
    render(<AcikHesaplar onPaid={() => {}} />);
    fireEvent.click(await screen.findByText('Tahsil et'));
    fireEvent.click(screen.getByText('Tahsilatı kaydet'));
    // Satır gidiyor ama geri alma şeridi kişiyi hâlâ anıyor.
    await waitFor(() => expect(screen.queryByText('Tahsil et')).toBeNull());
  });

  it('fiyatı olmayan hizmette tutar boş kalıyor', async () => {
    // Yanlışlıkla onaylanabilecek bir sıfır önermektense boş bırakmak.
    listUnpaidAppointments.mockResolvedValue([
      randevu({ service_name: 'Bilinmeyen' }),
    ]);
    render(<AcikHesaplar onPaid={() => {}} />);
    const alan = await screen.findByLabelText(/tahsilat tutarı/);
    expect(alan).toHaveProperty('value', '');

    fireEvent.click(screen.getByText('Tahsil et'));
    expect(await screen.findByText('Tutar sıfırdan büyük olmalı.')).toBeTruthy();
    expect(createPayment).not.toHaveBeenCalled();
  });
});

describe('AcikHesaplar · onay ve geri alma', () => {
  it('vazgeçince hiçbir şey yazılmıyor', async () => {
    render(<AcikHesaplar onPaid={() => {}} />);
    fireEvent.click(await screen.findByText('Tahsil et'));
    fireEvent.click(screen.getByText('Vazgeç'));

    expect(createPayment).not.toHaveBeenCalled();
    expect(screen.getByText('Tahsil et')).toBeTruthy();
  });

  it('onay kutusu ne yazılacağını gösteriyor', async () => {
    render(<AcikHesaplar onPaid={() => {}} />);
    fireEvent.click(await screen.findByText('Tahsil et'));
    expect(screen.getByText('Tahsilatı kaydet')).toBeTruthy();
    // Onay kutusu tutarı ve ödeme yöntemini birlikte gösteriyor.
    expect(screen.getByText(/₺ 500 · Nakit/)).toBeTruthy();
  });

  it('geri alma ödemeyi siliyor ve satırı listeye döndürüyor', async () => {
    const onPaid = vi.fn();
    render(<AcikHesaplar onPaid={onPaid} />);
    fireEvent.click(await screen.findByText('Tahsil et'));
    fireEvent.click(screen.getByText('Tahsilatı kaydet'));

    fireEvent.click(await screen.findByText('Geri al'));
    await waitFor(() => expect(deletePayment).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Tahsil et')).toBeTruthy();
    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(2));
  });

  it('geri alma başarısızsa satır geri gelmiyor ve sebep yazılıyor', async () => {
    // Ödeme hâlâ duruyorsa açık hesap da dönmemeli; yoksa iki kez
    // tahsil edilebilir görünürdü.
    deletePayment.mockRejectedValueOnce(new Error('Ödeme silinemedi.'));
    render(<AcikHesaplar onPaid={() => {}} />);
    fireEvent.click(await screen.findByText('Tahsil et'));
    fireEvent.click(screen.getByText('Tahsilatı kaydet'));
    fireEvent.click(await screen.findByText('Geri al'));

    expect(await screen.findByText('Ödeme silinemedi.')).toBeTruthy();
    expect(screen.queryByText('Tahsil et')).toBeNull();
  });
});
