import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnlineRandevu from './OnlineRandevu';

vi.mock('../api/booking', () => ({
  getBookingClinic: vi.fn(),
  getBookingSlots: vi.fn(),
  bookAppointment: vi.fn(),
}));

import { bookAppointment, getBookingClinic, getBookingSlots } from '../api/booking';

const KLINIK = {
  name: 'Lush Güzellik',
  address: 'Bağdat Cad. 12',
  phone: '02161234567',
  open_days: [1, 2, 3, 4, 5, 6, 7],
  days_ahead: 14,
  services: [
    { name: 'Saç kesimi', duration_minutes: 45, price: 500, color: '#B06A00' },
    { name: 'Manikür', duration_minutes: 45, price: 300, color: '#BE123C' },
  ],
};

const ciz = () =>
  render(
    <MemoryRouter initialEntries={['/r/lush']}>
      <Routes>
        <Route path="/r/:slug" element={<OnlineRandevu />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(getBookingClinic).mockResolvedValue(KLINIK);
  vi.mocked(getBookingSlots).mockResolvedValue({ day: '', times: ['10:00', '11:00'] });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OnlineRandevu', () => {
  it('kapalı sayfada danışanı merkezi aramaya yönlendirir', async () => {
    vi.mocked(getBookingClinic).mockRejectedValue(new Error('yok'));
    ciz();
    expect(await screen.findByText('Sayfa bulunamadı')).toBeTruthy();
  });

  it('saat, hizmet seçilmeden sorulmaz', async () => {
    ciz();
    await screen.findByText('Saç kesimi');
    expect(screen.queryByText(/3\. SAAT|3\. Saat/i)).toBeNull();
    expect(getBookingSlots).not.toHaveBeenCalled();
  });

  it('hizmet ve gün seçilince o hizmetin boş saatlerini sorar', async () => {
    ciz();
    fireEvent.click(await screen.findByText('Saç kesimi'));
    fireEvent.click(screen.getAllByRole('button', { pressed: false })[2]);
    await waitFor(() =>
      expect(vi.mocked(getBookingSlots).mock.calls[0][2]).toBe('Saç kesimi'),
    );
  });

  it('boş saat kalmayan günü söyler', async () => {
    vi.mocked(getBookingSlots).mockResolvedValue({ day: '', times: [] });
    ciz();
    fireEvent.click(await screen.findByText('Saç kesimi'));
    fireEvent.click(screen.getAllByRole('button', { pressed: false })[2]);
    expect(await screen.findByText(/boş saat kalmamış/)).toBeTruthy();
  });

  it('onay ekranı talebin kesin olmadığını söyler', async () => {
    vi.mocked(bookAppointment).mockResolvedValue({
      customer_name: 'Ayşe', service_name: 'Saç kesimi',
      appt_date: '2026-09-01', appt_time: '10:00', status: 'pending',
    });
    ciz();
    fireEvent.click(await screen.findByText('Saç kesimi'));
    fireEvent.click(screen.getAllByRole('button', { pressed: false })[2]);
    fireEvent.click(await screen.findByText('10:00'));
    fireEvent.change(screen.getByPlaceholderText('Adınız soyadınız'), {
      target: { value: 'Ayşe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Telefon numaranız'), {
      target: { value: '05321112233' },
    });
    fireEvent.click(screen.getByText('Randevu talebi gönder'));

    expect(await screen.findByText('Randevu talebiniz alındı')).toBeTruthy();
    expect(screen.getByText(/Merkez onayladıktan sonra/)).toBeTruthy();
  });

  it('sunucunun reddini olduğu gibi gösterir ve saatleri tazeler', async () => {
    vi.mocked(bookAppointment).mockRejectedValue(
      new Error('Bu saat dolmuş. Lütfen başka bir saat seçin.'),
    );
    ciz();
    fireEvent.click(await screen.findByText('Saç kesimi'));
    fireEvent.click(screen.getAllByRole('button', { pressed: false })[2]);
    fireEvent.click(await screen.findByText('10:00'));
    fireEvent.change(screen.getByPlaceholderText('Adınız soyadınız'), {
      target: { value: 'Ayşe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Telefon numaranız'), {
      target: { value: '05321112233' },
    });
    fireEvent.click(screen.getByText('Randevu talebi gönder'));

    expect(await screen.findByText('Bu saat dolmuş. Lütfen başka bir saat seçin.')).toBeTruthy();
    await waitFor(() => expect(vi.mocked(getBookingSlots).mock.calls.length).toBeGreaterThan(1));
  });
});
