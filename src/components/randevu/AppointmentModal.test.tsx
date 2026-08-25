import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppointmentModal from './AppointmentModal';

const createAppointment = vi.fn();

vi.mock('../../api/clinic', () => ({
  createAppointment: (...a: unknown[]) => createAppointment(...a),
  listServices: () =>
    Promise.resolve([{ id: 1, name: 'Saç kesimi', active: true }]),
}));

const listCustomers = vi.fn();
vi.mock('../../api/customers', () => ({
  getCustomer: () => Promise.reject(new Error('yok')),
  listCustomers: (...a: unknown[]) => listCustomers(...a),
}));

const MUSTERILER = [
  { phone: '05321112233', name: 'Ayşe Yılmaz' },
  { phone: '05339998877', name: '' },
];

beforeEach(() => {
  createAppointment.mockReset().mockResolvedValue({ appointment: {}, notified: true });
  listCustomers.mockReset().mockResolvedValue(MUSTERILER);
});
afterEach(cleanup);

const göster = () =>
  render(
    <AppointmentModal
      slots={['10:00', '11:00']}
      staff={[]}
      initial={{ date: '2026-09-01', time: '10:00', staffId: null }}
      onClose={() => {}}
      onCreated={() => {}}
    />,
  );

describe('AppointmentModal · danışan seçimi', () => {
  it('listeden seçilen danışanın numarası kendiliğinden doluyor', async () => {
    göster();
    const alan = await screen.findByLabelText('Danışan');
    fireEvent.change(alan, { target: { value: 'Ayşe' } });
    fireEvent.mouseDown(await screen.findByText(/Ayşe Yılmaz · 05321112233/));

    await waitFor(() =>
      expect(screen.getByPlaceholderText('905321112233')).toHaveProperty(
        'value',
        '05321112233',
      ),
    );
    expect(alan).toHaveProperty('value', 'Ayşe Yılmaz');
  });

  it('adsız danışan numarasıyla listeleniyor', async () => {
    göster();
    const alan = await screen.findByLabelText('Danışan');
    fireEvent.change(alan, { target: { value: '0533' } });
    expect(await screen.findByText('05339998877')).toBeTruthy();
  });

  it('listede olmayan yeni danışan da yazılabiliyor', async () => {
    göster();
    const alan = await screen.findByLabelText('Danışan');
    fireEvent.change(alan, { target: { value: 'Yeni Kişi' } });
    fireEvent.change(screen.getByPlaceholderText('905321112233'), {
      target: { value: '05335554433' },
    });
    fireEvent.click(screen.getByText('Randevu oluştur'));

    await waitFor(() =>
      expect(createAppointment.mock.calls[0][0]).toMatchObject({
        phone: '05335554433',
        customer_name: 'Yeni Kişi',
      }),
    );
  });
});
