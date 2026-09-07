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
vi.mock('../../api/payments', () => ({
  createPayment: (...a: unknown[]) => createPayment(...a),
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
    await waitFor(() => expect(screen.queryByText(/Ayşe Yılmaz/)).toBeNull());
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
