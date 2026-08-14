import { describe, expect, it } from 'vitest';
import { displayName, formatPhone, initials } from './people';

describe('formatPhone', () => {
  it('ülke koduyla gelen numarayı okunur hâle getirir', () => {
    expect(formatPhone('905321112233')).toBe('0532 111 22 33');
  });

  it('ülke kodu olmadan da çalışır', () => {
    expect(formatPhone('5321112233')).toBe('0532 111 22 33');
  });

  it('tanımadığı biçimi bozmadan bırakır', () => {
    // Uydurup yanlış bir numara göstermektense ham hâli dürüst.
    expect(formatPhone('12345')).toBe('12345');
    expect(formatPhone('')).toBe('');
  });
});

describe('displayName', () => {
  it('adı varsa adını verir', () => {
    expect(displayName({ name: 'Elif Kaya', phone: '905321112233' })).toBe('Elif Kaya');
  });

  it('ad yoksa numarayı numara gibi gösterir', () => {
    expect(displayName({ name: '', phone: '905321112233' })).toBe('İsimsiz · 0532 111 22 33');
  });

  it('boşluktan ibaret adı ad saymaz', () => {
    expect(displayName({ name: '   ', phone: '905321112233' })).toBe(
      'İsimsiz · 0532 111 22 33',
    );
  });

  it('elde hiçbir şey yokken de bir şey söyler', () => {
    expect(displayName({ name: null, phone: null })).toBe('İsimsiz');
  });
});

describe('initials', () => {
  it('ilk iki kelimenin baş harfini alır', () => {
    expect(initials({ name: 'Elif Kaya Demir' })).toBe('EK');
  });

  it('Türkçe harfleri doğru büyütür', () => {
    // 'i' → 'İ'. Varsayılan toUpperCase'te bu çift bozuluyor.
    expect(initials({ name: 'irem şahin' })).toBe('İŞ');
  });

  it('isimsiz kayıtta harf uydurmaz', () => {
    expect(initials({ name: '', phone: '905321112233' })).toBe('#');
  });
});
