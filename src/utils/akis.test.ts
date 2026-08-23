import { describe, expect, it } from 'vitest';
import { bosSlotSayisi, gunAkisi, yaklasanlar } from './akis';
import type { Appointment } from '../api/clinic';

const randevu = (time: string, status = 'confirmed', id = 1, date = '2026-08-23'): Appointment =>
  ({ id, appt_time: time, appt_date: date, status,
     customer_name: 'Ayşe', phone: '0532', service_name: 'Cilt bakımı',
     staff_name: '' } as Appointment);

describe('gunAkisi', () => {
  it('boş slotları randevularla sıralı biçimde birleştirir', () => {
    const out = gunAkisi(['10:00', '11:00', '12:00'], [randevu('11:00')]);
    expect(out.map((r) => [r.time, r.appointment !== null])).toEqual([
      ['10:00', false], ['11:00', true], ['12:00', false],
    ]);
  });

  it('slot ızgarasının dışındaki randevuyu de gösterir', () => {
    const out = gunAkisi(['10:00'], [randevu('10:30')]);
    expect(out.map((r) => r.time)).toEqual(['10:00', '10:30']);
  });

  it('aynı saatteki iki randevuyu ayrı satıra koyar', () => {
    const out = gunAkisi(['10:00'], [randevu('10:00', 'confirmed', 1), randevu('10:00', 'pending', 2)]);
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.appointment !== null)).toBe(true);
  });

  it('iptal edilen randevu slotu boş bırakır', () => {
    const out = gunAkisi(['10:00'], [randevu('10:00', 'cancelled')]);
    expect(out).toEqual([{ time: '10:00', appointment: null }]);
    expect(bosSlotSayisi(['10:00'], [randevu('10:00', 'cancelled')])).toBe(1);
  });
});

describe('yaklasanlar', () => {
  const g = (date: string, time: string, status = 'confirmed') =>
    randevu(time, status, 1, date);

  it('bugünü ve geçmişi dışarıda bırakır', () => {
    const out = yaklasanlar(
      [g('2026-08-23', '10:00'), g('2026-08-20', '10:00'), g('2026-08-27', '09:00')],
      '2026-08-23',
    );
    expect(out.map((a) => a.appt_date)).toEqual(['2026-08-27']);
  });

  it('tarih ve saate göre sıralar, sayıyı sınırlar', () => {
    const out = yaklasanlar(
      [g('2026-08-30', '10:00'), g('2026-08-27', '14:00'), g('2026-08-27', '09:00')],
      '2026-08-23',
      2,
    );
    expect(out.map((a) => `${a.appt_date} ${a.appt_time}`))
      .toEqual(['2026-08-27 09:00', '2026-08-27 14:00']);
  });

  it('iptal edilen randevuyu saymaz', () => {
    expect(yaklasanlar([g('2026-08-27', '09:00', 'cancelled')], '2026-08-23')).toEqual([]);
  });
});
