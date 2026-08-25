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

const yeniyeGec = () => fireEvent.click(screen.getByText('Yeni danışan'));

describe('AppointmentModal · kayıtlı danışan', () => {
  it('kayıtlı danışan modu açık başlıyor', async () => {
    göster();
    expect(await screen.findByLabelText('Danışan')).toBeTruthy();
    // Yeni danışan alanları görünmemeli.
    expect(screen.queryByPlaceholderText('Ad soyad')).toBeNull();
  });

  it('seçilen danışanın numarası kendiliğinden geliyor', async () => {
    göster();
    const alan = await screen.findByLabelText('Danışan');
    fireEvent.change(alan, { target: { value: 'Ayşe' } });
    fireEvent.mouseDown(await screen.findByText(/Ayşe Yılmaz · 05321112233/));

    expect(await screen.findByText('05321112233')).toBeTruthy();
    expect(alan).toHaveProperty('value', 'Ayşe Yılmaz');
  });

  it('adsız danışan numarasıyla listeleniyor', async () => {
    göster();
    fireEvent.change(await screen.findByLabelText('Danışan'), {
      target: { value: '0533' },
    });
    expect(await screen.findByText('05339998877')).toBeTruthy();
  });

  it('ad elle değiştirilince seçilen numara düşüyor', async () => {
    // Yoksa yanlış kişiye randevu yazılırdı.
    göster();
    const alan = await screen.findByLabelText('Danışan');
    fireEvent.change(alan, { target: { value: 'Ayşe' } });
    fireEvent.mouseDown(await screen.findByText(/Ayşe Yılmaz · 05321112233/));
    await screen.findByText('05321112233');

    fireEvent.change(alan, { target: { value: 'Ayşe B' } });
    expect(screen.queryByText('05321112233')).toBeNull();
  });

  it('seçim yapılmadan kaydedilirse ne yapılacağını söylüyor', async () => {
    göster();
    await screen.findByLabelText('Danışan');
    fireEvent.click(screen.getByText('Randevu oluştur'));
    expect(
      await screen.findByText(/Listeden bir danışan seçin/),
    ).toBeTruthy();
    expect(createAppointment).not.toHaveBeenCalled();
  });
});

describe('AppointmentModal · yeni danışan', () => {
  it('ad ve numara elle yazılıyor', async () => {
    göster();
    await screen.findByLabelText('Danışan');
    yeniyeGec();

    fireEvent.change(screen.getByPlaceholderText('Ad soyad'), {
      target: { value: 'Yeni Kişi' },
    });
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

  it('mod değişince seçilmiş numara temizleniyor', async () => {
    // Yeni kişiyi başkasının numarasına yazmamak için.
    göster();
    const alan = await screen.findByLabelText('Danışan');
    fireEvent.change(alan, { target: { value: 'Ayşe' } });
    fireEvent.mouseDown(await screen.findByText(/Ayşe Yılmaz · 05321112233/));
    await screen.findByText('05321112233');

    yeniyeGec();
    expect(screen.getByPlaceholderText('905321112233')).toHaveProperty('value', '');
    expect(screen.getByPlaceholderText('Ad soyad')).toHaveProperty('value', '');
  });
});
