import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppointmentDetail from './AppointmentDetail';

const rescheduleAppointment = vi.fn();
const cancelAppointment = vi.fn();
const confirmAppointment = vi.fn();

vi.mock('../../api/clinic', () => ({
  assignAppointmentStaff: vi.fn(),
  cancelAppointment: (...a: unknown[]) => cancelAppointment(...a),
  confirmAppointment: (...a: unknown[]) => confirmAppointment(...a),
  getSettings: () => Promise.resolve({ slot_times: ['10:00', '11:00', '12:00'] }),
  rescheduleAppointment: (...a: unknown[]) => rescheduleAppointment(...a),
}));

vi.mock('../../api/conversations', () => ({
  listConversations: () => Promise.resolve([]),
}));

const APPT = {
  id: 7,
  phone: '905321110001',
  customer_name: 'Ayşe Yılmaz',
  service_name: 'Kontrol',
  appt_date: '2026-09-01',
  appt_time: '10:00',
  status: 'confirmed',
  staff_id: null,
  created_at: '2026-08-20T09:00:00Z',
};

const onChanged = vi.fn();

beforeEach(() => {
  rescheduleAppointment.mockReset().mockResolvedValue({ ...APPT, appt_date: '2026-09-03' });
  onChanged.mockReset();
});
afterEach(cleanup);

const göster = (appointment = APPT) =>
  render(
    <AppointmentDetail
      appointment={appointment as never}
      staff={[]}
      onClose={() => {}}
      onChanged={onChanged}
      onMessage={() => {}}
    />,
  );

describe('AppointmentDetail — erteleme', () => {
  it('form kapalı başlıyor', async () => {
    göster();
    expect(await screen.findByText('Ertele')).toBeTruthy();
    expect(screen.queryByText('Taşı')).toBeNull();
  });

  it('iptal edilmiş randevuda ertele düğmesi yok', async () => {
    göster({ ...APPT, status: 'cancelled' });
    await screen.findByText('Mesaj gönder');
    expect(screen.queryByText('Ertele')).toBeNull();
  });

  it('saat listesi kliniğin ayarından geliyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Ertele'));
    fireEvent.click(screen.getByRole('combobox', { name: 'Yeni saat' }));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
  });

  it('taşıma yeni günü ve saati gönderiyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Ertele'));
    fireEvent.click(screen.getByRole('combobox', { name: 'Yeni saat' }));
    fireEvent.mouseDown(screen.getByText('12:00'));
    fireEvent.click(screen.getByText('Taşı'));

    await waitFor(() => expect(rescheduleAppointment).toHaveBeenCalled());
    expect(rescheduleAppointment).toHaveBeenCalledWith(7, {
      appt_date: '2026-09-01',
      appt_time: '12:00',
      notify: true,
    });
  });

  it('bildirim kapatılabiliyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Ertele'));
    fireEvent.click(screen.getByLabelText(/WhatsApp'tan bildir/));
    fireEvent.click(screen.getByText('Taşı'));

    await waitFor(() => expect(rescheduleAppointment).toHaveBeenCalled());
    expect(rescheduleAppointment.mock.calls[0][1].notify).toBe(false);
  });

  it('vazgeçmek formu kapatıyor ve hiçbir şey göndermiyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Ertele'));
    fireEvent.click(screen.getByText('Vazgeç'));

    expect(screen.queryByText('Taşı')).toBeNull();
    expect(rescheduleAppointment).not.toHaveBeenCalled();
  });
});
