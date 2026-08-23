// Ürün stoğu ve hareketleri.
import { request } from './client';

export interface Product {
  id: number;
  name: string;
  unit: string;
  /** Ürün ucuyla değil, hareketle değişiyor. */
  quantity: number;
  /** Bu miktarın altına düşünce uyarı çıkıyor. 0 = uyarı yok. */
  min_quantity: number;
  price: number;
  cost: number;
  active: boolean;
  sort_order: number;
}
export type ProductInput = Omit<Product, 'id' | 'quantity'>;

export type MovementReason = 'giris' | 'cikis' | 'sayim' | 'satis';

export interface StockMovement {
  id: number;
  product_id: number;
  delta: number;
  reason: MovementReason;
  note: string;
  quantity_after: number;
  created_at: string; // ISO
}

export const listProducts = () => request<Product[]>('/api/products');

export const listLowStock = () => request<Product[]>('/api/products/low');

export const createProduct = (p: ProductInput) =>
  request<Product>('/api/products', { method: 'POST', body: JSON.stringify(p) });

export const updateProduct = (id: number, p: ProductInput) =>
  request<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(p) });

export const deleteProduct = (id: number) =>
  request<void>(`/api/products/${id}`, { method: 'DELETE' });

export const listMovements = (productId: number) =>
  request<StockMovement[]>(`/api/products/${productId}/movements`);

export const addMovement = (
  productId: number,
  body: { delta: number; reason: MovementReason; note?: string },
) =>
  request<StockMovement>(`/api/products/${productId}/movements`, {
    method: 'POST',
    body: JSON.stringify({ note: '', ...body }),
  });

/** Fiziksel sayım: sunucu farkı hareket olarak yazıyor. */
export const countProduct = (productId: number, counted: number, note = '') =>
  request<StockMovement>(`/api/products/${productId}/count`, {
    method: 'POST',
    body: JSON.stringify({ counted, note }),
  });
