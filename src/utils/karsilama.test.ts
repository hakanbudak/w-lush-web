import { describe, expect, it } from 'vitest';
import { gunSatiri, ozetSatiri, selamlama } from './karsilama';

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
