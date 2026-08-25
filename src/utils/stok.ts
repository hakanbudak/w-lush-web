import type { MovementReason, Product, StockMovement } from '../api/stock';

export const REASON_LABEL: Record<MovementReason, string> = {
  giris: 'Giriş',
  cikis: 'Çıkış',
  sayim: 'Sayım',
  satis: 'Satış',
};

/** "+12" · "−3" — eksi işareti gerçek eksi, tire değil. */
export const signed = (n: number): string => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

export type StokDurum = 'bitti' | 'azaldi' | 'yeterli' | 'takipsiz';

/**
 * Ürünün stok durumu.
 *
 * Eşiği olmayan ürün "takipsiz": her ürüne eşik girmeyi zorunlu kılmamak
 * için, ama eşiksiz bir ürünü "yeterli" diye göstermek de olmayan bir
 * kontrolü yapılmış gibi anlatmak olurdu.
 */
export function durum(p: Product): StokDurum {
  if (p.quantity === 0) return 'bitti';
  if (p.min_quantity <= 0) return 'takipsiz';
  return p.quantity <= p.min_quantity ? 'azaldi' : 'yeterli';
}

/** Bir hareketin tek satırlık özeti. */
export function ozet(m: StockMovement, unit: string): string {
  const bas = `${REASON_LABEL[m.reason]} ${signed(m.delta)} ${unit}`;
  return m.note ? `${bas} · ${m.note}` : bas;
}

/**
 * Ürünün güncel alış fiyatı, geçmiş bir hareketin maliyetinden farklıysa
 * true. Panel bunu gösteriyor: aksi hâlde eski satırın yanındaki rakamın
 * neden bugünkü fiyatla uyuşmadığı anlaşılmıyor.
 */
export const maliyetDegismis = (m: StockMovement, guncelCost: number): boolean =>
  m.unit_cost > 0 && m.unit_cost !== guncelCost;
