import { describe, expect, it } from 'vitest';
import { wordFor } from './RotatingWord';

describe('wordFor', () => {
  it('sırayla döner', () => {
    expect(wordFor(0)).not.toBe(wordFor(1));
  });

  it('dizinin sonuna gelince başa sarar', () => {
    // Zamanlayıcı sonsuza kadar sayıyor; taşan sayı boş kelime vermemeli.
    expect(wordFor(0)).toBe(wordFor(5));
    expect(wordFor(123)).toBeTruthy();
  });

  it('klinik tipi döndürmüyor', () => {
    // Ürün güzellik merkezleri için; "diş kliniği" gibi bir kelime
    // desteklemediğimiz bir işi vaat ederdi.
    const hepsi = Array.from({ length: 12 }, (_, i) => wordFor(i));
    expect(hepsi.some((w) => w.includes('klinik'))).toBe(false);
  });
});
