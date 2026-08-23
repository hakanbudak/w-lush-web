import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IzinSection from './IzinSection';

const listLeaves = vi.fn();
const createLeave = vi.fn();
const deleteLeave = vi.fn();

vi.mock('../../api/staff', () => ({
  listLeaves: (...a: unknown[]) => listLeaves(...a),
  createLeave: (...a: unknown[]) => createLeave(...a),
  deleteLeave: (...a: unknown[]) => deleteLeave(...a),
}));

const KISI = { id: 3, name: 'Dr. Elif', role: 'Uzman', active: true, sort_order: 0 };
const IZIN = {
  id: 9, staff_id: 3, starts_on: '2026-09-12', ends_on: '2026-09-20',
  reason: 'Yıllık izin',
};

beforeEach(() => {
  listLeaves.mockReset().mockResolvedValue([]);
  createLeave.mockReset().mockResolvedValue({ leave: IZIN, conflicts: [] });
  deleteLeave.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

const goster = () => render(<IzinSection person={KISI as never} />);

/**
 * Takvimden bir gün seç. Hangi gün olduğu bu testlerin konusu değil —
 * seçici içinde bulunulan ayı açıyor, o yüzden sabit bir tarih yazmak testi
 * takvime bağımlı yapardı.
 */
async function birGunSec(alan: string) {
  fireEvent.click(screen.getByRole('button', { name: alan }));
  const gunler = screen
    .getAllByRole('button')
    .filter((b) => /^\d{2}\.\d{2}\.\d{4}$/.test(b.getAttribute('aria-label') ?? ''));
  const secilen = gunler.find((b) => !b.hasAttribute('disabled'))!;
  const iso = secilen.getAttribute('aria-label')!.split('.').reverse().join('-');
  fireEvent.click(secilen);
  return iso;
}

describe('IzinSection', () => {
  it('kayıtlı izin yokken bunu söylüyor', async () => {
    goster();
    await screen.findByText('Kayıtlı izin yok.');
  });

  it('aralığı iki uçlu gösteriyor', async () => {
    listLeaves.mockResolvedValue([IZIN]);
    goster();
    await screen.findByText('12.09.2026 – 20.09.2026');
  });

  it('tek günlük izni tek tarih olarak gösteriyor', async () => {
    listLeaves.mockResolvedValue([{ ...IZIN, ends_on: IZIN.starts_on }]);
    goster();
    await screen.findByText('12.09.2026');
  });

  it('bitiş boşsa tek günlük izin gönderiyor', async () => {
    goster();
    fireEvent.click(await screen.findByText('İzin ekle'));
    const gun = await birGunSec('İzin başlangıcı');
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => expect(createLeave).toHaveBeenCalled());
    const [, body] = createLeave.mock.calls[0];
    expect(body.starts_on).toBe(gun);
    expect(body.ends_on).toBe(gun);
  });

  it('çakışan randevuları telefonlarıyla listeliyor', async () => {
    createLeave.mockResolvedValue({
      leave: IZIN,
      conflicts: [{
        id: 1, appt_date: '2026-09-14', appt_time: '10:00',
        customer_name: 'Ayşe Yılmaz', phone: '905321110001', service_name: 'Cilt bakımı',
      }],
    });
    goster();
    fireEvent.click(await screen.findByText('İzin ekle'));
    await birGunSec('İzin başlangıcı');
    fireEvent.click(screen.getByText('Kaydet'));

    await screen.findByText(/1 randevu var/);
    // Operatörün kimi arayacağını görmesi gerekiyor.
    expect(screen.getByText(/Ayşe Yılmaz/)).toBeTruthy();
  });

  it('izin silinebiliyor', async () => {
    listLeaves.mockResolvedValue([IZIN]);
    goster();
    fireEvent.click(await screen.findByLabelText('İzni sil'));

    await waitFor(() => expect(deleteLeave).toHaveBeenCalledWith(9));
  });
});
