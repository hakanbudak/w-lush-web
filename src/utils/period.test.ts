import { describe, expect, it } from 'vitest';
import { rangeFor } from './period';

describe('rangeFor', () => {
  const wednesday = new Date(2026, 7, 12); // 12 Ağustos 2026, Çarşamba

  it('gives a single day for today', () => {
    expect(rangeFor('gun', wednesday)).toEqual({ start: '2026-08-12', end: '2026-08-12' });
  });

  it('starts the week on Monday', () => {
    // Kliniğin open_days ayarı da ISO gün numarası kullanıyor; iki farklı
    // hafta başlangıcı olsaydı doluluk ve gelir farklı haftaları sayardı.
    expect(rangeFor('hafta', wednesday)).toEqual({ start: '2026-08-10', end: '2026-08-16' });
  });

  it('keeps a Monday as the start of its own week', () => {
    expect(rangeFor('hafta', new Date(2026, 7, 10)).start).toBe('2026-08-10');
  });

  it('puts a Sunday in the week that started six days earlier', () => {
    expect(rangeFor('hafta', new Date(2026, 7, 16))).toEqual({
      start: '2026-08-10',
      end: '2026-08-16',
    });
  });

  it('covers the whole month, including days after today', () => {
    expect(rangeFor('ay', wednesday)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  it('knows a short month', () => {
    expect(rangeFor('ay', new Date(2026, 1, 5)).end).toBe('2026-02-28');
  });

  it('covers the whole year', () => {
    expect(rangeFor('yil', wednesday)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});
