import { describe, expect, it } from 'vitest';
import { wordFor } from './RotatingWord';

describe('wordFor', () => {
  it('rotates through the clinic types', () => {
    expect(wordFor(null, 0)).toBe('diş kliniği');
    expect(wordFor(null, 1)).toBe('güzellik merkezi');
  });

  it('wraps around at the end', () => {
    // Sayaç sınırsız artıyor; kelime listesi beşte bitiyor.
    expect(wordFor(null, 5)).toBe(wordFor(null, 0));
    expect(wordFor(null, 11)).toBe(wordFor(null, 1));
  });

  it('locks to the chosen type', () => {
    expect(wordFor('fizyoterapi', 0)).toBe('fizyoterapi merkezi');
    expect(wordFor('fizyoterapi', 3)).toBe('fizyoterapi merkezi');
  });

  it('knows the escape-hatch type that never rotates', () => {
    // "Diğer" dönüşte yok ama seçilebilir, yani kilitken bir karşılığı olmalı.
    expect(wordFor('diger', 0)).toBe('sağlık merkezi');
  });

  it('falls back to rotating on an unknown lock', () => {
    // Eski bir ayar ya da elle düzenlenmiş veri boş başlık bırakmamalı.
    expect(wordFor('veteriner', 2)).toBe(wordFor(null, 2));
  });
});
