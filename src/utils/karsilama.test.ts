import { describe, expect, it } from 'vitest';
import {
  akisGunu, gunSatiri, kisaGun, ozetSatiri, randevuBildirimi, selamlama,
} from './karsilama';

describe('gunSatiri', () => {
  it('tarihi Türkçe gün ve ay adıyla yazar', () => {
    expect(gunSatiri(new Date(2026, 7, 23))).toBe('23 Ağustos 2026 · Pazar');
  });
});

describe('selamlama', () => {
  it('saate göre değişir', () => {
    expect(selamlama(8)).toBe('Günaydın');
    expect(selamlama(14)).toBe('İyi günler');
    expect(selamlama(21)).toBe('İyi akşamlar');
  });
});

describe('ozetSatiri', () => {
  it('randevu yokken boş slot sayısını söyler', () => {
    expect(ozetSatiri({ randevu: 0, bosSlot: 12, tahsilat: 0 }))
      .toBe('Bugün randevu yok — 12 slot boş.');
  });

  it('çalışma saati tanımsızsa bunu söyler', () => {
    expect(ozetSatiri({ randevu: 0, bosSlot: 0, tahsilat: 0 }))
      .toBe('Bugün için tanımlı çalışma saati yok.');
  });

  it('tahsilat sıfırsa özete girmez', () => {
    expect(ozetSatiri({ randevu: 4, bosSlot: 2, tahsilat: 0 }))
      .toBe('Bugün 4 randevu · 2 slot boş.');
  });

  it('dolu günü tek cümlede toplar', () => {
    expect(ozetSatiri({ randevu: 4, bosSlot: 2, tahsilat: 4200 }))
      .toBe('Bugün 4 randevu · 2 slot boş · ₺ 4.200 tahsilat.');
  });
});

describe('randevuBildirimi', () => {
  const randevu = { appt_date: '2026-08-27', appt_time: '09:00' };

  it('hangi güne yazıldığını söyler', () => {
    expect(randevuBildirimi(randevu, true, '2026-08-23').text)
      .toBe('27 Ağustos Perşembe 09:00 randevusu oluşturuldu, danışana WhatsApp bilgisi gönderildi.');
  });

  it('mesaj gitmediyse bunu ayrıca yazar', () => {
    expect(randevuBildirimi(randevu, false, '2026-08-23').text)
      .toContain('ancak danışana mesaj iletilemedi');
  });

  it('ileri tarihli randevuyu başka gün olarak işaretler', () => {
    expect(randevuBildirimi(randevu, true, '2026-08-23').baskaGun).toBe(true);
  });

  it('bugüne yazılan randevu başka gün değil', () => {
    expect(randevuBildirimi(randevu, true, '2026-08-27').baskaGun).toBe(false);
  });

  it('kisaGun yılı yazmaz', () => {
    expect(kisaGun('2026-08-27')).toBe('27 Ağustos Perşembe');
  });
});

describe('akisGunu', () => {
  it('gün içinde bugünü gösterir', () => {
    expect(akisGunu(new Date(2026, 7, 25, 14, 0))).toEqual({
      iso: '2026-08-25', yarin: false,
    });
  });

  it('19:59 hâlâ bugün', () => {
    expect(akisGunu(new Date(2026, 7, 25, 19, 59)).yarin).toBe(false);
  });

  it('20:00 olunca yarına geçer', () => {
    expect(akisGunu(new Date(2026, 7, 25, 20, 0))).toEqual({
      iso: '2026-08-26', yarin: true,
    });
  });

  it('ay sonunda ertesi aya taşar', () => {
    expect(akisGunu(new Date(2026, 7, 31, 22, 0)).iso).toBe('2026-09-01');
  });

  it('yıl sonunda ertesi yıla taşar', () => {
    expect(akisGunu(new Date(2026, 11, 31, 21, 0)).iso).toBe('2027-01-01');
  });
});
