import { describe, expect, it } from 'vitest';
import { kurusa, tl, toplamlar } from './fatura';

describe('tl', () => {
  it('kuruşu iki ondalıkla yazar', () => {
    expect(tl(50000)).toBe('₺ 500,00');
    expect(tl(1)).toBe('₺ 0,01');
  });
});

describe('kurusa', () => {
  it('virgülü de noktayı da kabul eder', () => {
    // Birini reddetmek tutarı sessizce yüz katına çıkarırdı.
    expect(kurusa('500,50')).toBe(50050);
    expect(kurusa('500.50')).toBe(50050);
  });

  it('tam sayıyı kuruşa çevirir', () => {
    expect(kurusa('500')).toBe(50000);
  });

  it('geçersiz girdide sıfır döner, NaN değil', () => {
    expect(kurusa('abc')).toBe(0);
    expect(kurusa('')).toBe(0);
    expect(kurusa('1,2,3')).toBe(0);
  });

  it('kuruş kesirini yuvarlar', () => {
    expect(kurusa('0,005')).toBe(1);
  });
});

describe('toplamlar', () => {
  it('KDV\'yi satır satır yuvarlar', () => {
    // Sunucudaki hesabın aynısı: 9999*0.2=1999.8→2000, 1*0.2=0.2→0
    expect(toplamlar([
      { quantity: 3, unit_price_kurus: 3333, vat_rate: 20 },
      { quantity: 1, unit_price_kurus: 1, vat_rate: 20 },
    ])).toEqual({ net: 10000, kdv: 2000, toplam: 12000 });
  });

  it('farklı oranları birlikte toplar', () => {
    expect(toplamlar([
      { quantity: 1, unit_price_kurus: 10000, vat_rate: 20 },
      { quantity: 1, unit_price_kurus: 10000, vat_rate: 10 },
    ])).toEqual({ net: 20000, kdv: 3000, toplam: 23000 });
  });

  it('boş faturada sıfır', () => {
    expect(toplamlar([])).toEqual({ net: 0, kdv: 0, toplam: 0 });
  });
});
