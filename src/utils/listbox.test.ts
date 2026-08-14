import { describe, expect, it } from 'vitest';
import { filterOptions, indexOfValue, moveIndex } from './listbox';

const OPTIONS = [
  { value: '1', label: 'Cilt Bakımı' },
  { value: '2', label: 'Lazer Epilasyon' },
  { value: '3', label: 'Şişme İğnesi' },
];

describe('moveIndex', () => {
  it('aşağı ve yukarı bir adım gider', () => {
    expect(moveIndex('ArrowDown', 0, 3)).toBe(1);
    expect(moveIndex('ArrowUp', 2, 3)).toBe(1);
  });

  it('uçlarda durur, başa sarmaz', () => {
    expect(moveIndex('ArrowDown', 2, 3)).toBe(2);
    expect(moveIndex('ArrowUp', 0, 3)).toBe(0);
  });

  it('hiçbir şey vurgulu değilken yukarı sona gider', () => {
    expect(moveIndex('ArrowUp', -1, 3)).toBe(2);
  });

  it('Home ve End uçlara atlar', () => {
    expect(moveIndex('Home', 2, 3)).toBe(0);
    expect(moveIndex('End', 0, 3)).toBe(2);
  });

  it('taşımayan tuş için null döner', () => {
    expect(moveIndex('a', 1, 3)).toBeNull();
    expect(moveIndex('Enter', 1, 3)).toBeNull();
  });

  it('boş listede hiçbir tuş taşımaz', () => {
    expect(moveIndex('ArrowDown', -1, 0)).toBeNull();
  });
});

describe('filterOptions', () => {
  it('boş sorgu listeyi olduğu gibi bırakır', () => {
    expect(filterOptions(OPTIONS, '   ')).toHaveLength(3);
  });

  it('büyük/küçük harf ayırmaz', () => {
    expect(filterOptions(OPTIONS, 'LAZER')).toEqual([OPTIONS[1]]);
  });

  it('Türkçe harfleri doğru küçültür', () => {
    // 'Şişme' → 'şişme'. Varsayılan toLowerCase'te İ/I çifti bozuluyor.
    expect(filterOptions(OPTIONS, 'ŞİŞME')).toEqual([OPTIONS[2]]);
  });

  it('eşleşme yoksa boş döner', () => {
    expect(filterOptions(OPTIONS, 'protez')).toEqual([]);
  });
});

describe('indexOfValue', () => {
  it('seçili değerin sırasını bulur', () => {
    expect(indexOfValue(OPTIONS, '2')).toBe(1);
  });

  it('listede olmayan değer için -1 döner', () => {
    expect(indexOfValue(OPTIONS, '9')).toBe(-1);
  });
});
