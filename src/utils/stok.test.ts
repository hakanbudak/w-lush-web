import { describe, expect, it } from 'vitest';
import { durum, maliyetDegismis, ozet, signed } from './stok';
import type { Product, StockMovement } from '../api/stock';

const urun = (over: Partial<Product> = {}): Product => ({
  id: 1, name: 'Şampuan', unit: 'adet', quantity: 10, min_quantity: 5,
  price: 300, cost: 180, active: true, sort_order: 0, ...over,
});

describe('signed', () => {
  it('artı ve eksiyi işaretiyle yazar', () => {
    expect(signed(12)).toBe('+12');
    expect(signed(-3)).toBe('−3');
  });
});

describe('durum', () => {
  it('eşiğin üstündeki ürün yeterli', () => {
    expect(durum(urun())).toBe('yeterli');
  });

  it('eşiğe inen ürün azalmış sayılır', () => {
    expect(durum(urun({ quantity: 5 }))).toBe('azaldi');
  });

  it('biten ürün ayrı', () => {
    expect(durum(urun({ quantity: 0 }))).toBe('bitti');
  });

  it('eşiği olmayan ürün takipsiz — "yeterli" demek olmayan bir kontrolü yapılmış gibi gösterirdi', () => {
    expect(durum(urun({ min_quantity: 0 }))).toBe('takipsiz');
    expect(durum(urun({ min_quantity: 0, quantity: 0 }))).toBe('bitti');
  });
});

describe('ozet', () => {
  const hareket = (over: Partial<StockMovement> = {}): StockMovement => ({
    id: 1, product_id: 1, delta: 12, reason: 'giris', note: '',
    quantity_after: 12, happened_on: '2026-08-24', unit_cost: 180,
    created_at: '2026-08-24T10:00:00', payment_id: null, expense_id: null, ...over,
  });

  it('türü, miktarı ve birimi yazar', () => {
    expect(ozet(hareket(), 'adet')).toBe('Giriş +12 adet');
  });

  it('not varsa ekler', () => {
    expect(ozet(hareket({ reason: 'sayim', delta: -3, note: 'Ay sonu' }), 'adet'))
      .toBe('Sayım −3 adet · Ay sonu');
  });
});

describe('maliyetDegismis', () => {
  const hareket = (unit_cost: number): StockMovement => ({
    id: 1, product_id: 1, delta: -2, reason: 'satis', note: '',
    quantity_after: 3, happened_on: '2026-07-01', unit_cost,
    created_at: '2026-07-01T10:00:00', payment_id: 4, expense_id: null,
  });

  it('alış fiyatı değişmişse işaretler', () => {
    expect(maliyetDegismis(hareket(180), 250)).toBe(true);
  });

  it('aynıysa işaretlemez', () => {
    expect(maliyetDegismis(hareket(180), 180)).toBe(false);
  });

  it('maliyeti hiç yazılmamış eski hareketi işaretlemez', () => {
    // Göç öncesi satırlar; olmayan bir farkı varmış gibi göstermeyelim.
    expect(maliyetDegismis(hareket(0), 250)).toBe(false);
  });
});
