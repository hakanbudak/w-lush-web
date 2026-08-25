import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stok from './Stok';
import type { Product, StockMovement } from '../api/stock';

vi.mock('../api/expenses', () => ({ listCategories: vi.fn() }));
vi.mock('../api/stock', () => ({
  listProducts: vi.fn(),
  listMovements: vi.fn(),
  addMovement: vi.fn(),
  countProduct: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

import {
  addMovement, countProduct, listMovements, listProducts,
} from '../api/stock';
import { listCategories } from '../api/expenses';

const hareket = (over: Partial<StockMovement> = {}): StockMovement => ({
  id: 1, product_id: 1, delta: -3, reason: 'cikis', note: '',
  quantity_after: 7, happened_on: '2026-08-24', unit_cost: 180,
  created_at: '2026-08-24T10:00:00', payment_id: null, expense_id: null, ...over,
});

const urun = (over: Partial<Product> = {}): Product => ({
  id: 1, name: 'Şampuan', unit: 'adet', quantity: 10, min_quantity: 5,
  price: 300, cost: 180, active: true, sort_order: 0, ...over,
});

const ciz = () => render(<MemoryRouter><Stok /></MemoryRouter>);

beforeEach(() => {
  vi.mocked(listProducts).mockResolvedValue([urun()]);
  vi.mocked(listMovements).mockResolvedValue([]);
  vi.mocked(listCategories).mockResolvedValue([
    { id: 1, name: 'Ürün & sarf', active: true, sort_order: 0 },
  ]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const hareketAc = async () => {
  fireEvent.click(await screen.findByText('Hareket'));
};

/**
 * Select seçenekleri onMouseDown ile seçiliyor (bkz. ui/OptionList).
 * Ekranda birden çok combobox var (hareket türü ve gider kategorisi),
 * o yüzden erişilebilir adıyla seçiliyor.
 */
const turSec = async (etiket: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: 'Hareket türü' }));
  fireEvent.mouseDown(await screen.findByText(etiket));
};

describe('Stok', () => {
  it('miktarı ve durumu gösterir', async () => {
    ciz();
    expect(await screen.findByText('Şampuan')).toBeTruthy();
    expect(screen.getByText('Yeterli')).toBeTruthy();
  });

  it('eşiğe inen ürünü azalmış gösterir', async () => {
    vi.mocked(listProducts).mockResolvedValue([urun({ quantity: 5 })]);
    ciz();
    expect(await screen.findByText('Azaldı')).toBeTruthy();
  });

  it('çıkış hareketi eksi delta olarak gider', async () => {
    vi.mocked(addMovement).mockResolvedValue(hareket());
    ciz();
    await hareketAc();
    await turSec('Çıkış');
    fireEvent.change(screen.getByLabelText(/Miktar/), { target: { value: '3' } });
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() =>
      expect(vi.mocked(addMovement).mock.calls[0][1]).toEqual({
        delta: -3, reason: 'cikis', note: '', money: null,
      }),
    );
  });

  it('sayımda sayılan toplam gider, farkı sunucu hesaplar', async () => {
    vi.mocked(countProduct).mockResolvedValue(hareket({ reason: 'sayim' }));
    ciz();
    await hareketAc();
    await turSec('Sayım');
    fireEvent.change(screen.getByLabelText(/Sayılan/), { target: { value: '7' } });
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => expect(vi.mocked(countProduct).mock.calls[0][1]).toBe(7));
    expect(addMovement).not.toHaveBeenCalled();
  });

  it('sunucunun reddini olduğu gibi gösterir', async () => {
    vi.mocked(addMovement).mockRejectedValue(
      new Error('Stokta 10 adet var, 12 çıkışı yapılamaz.'),
    );
    ciz();
    await hareketAc();
    fireEvent.change(screen.getByLabelText(/Miktar/), { target: { value: '12' } });
    fireEvent.click(screen.getByText('Kaydet'));
    expect(
      await screen.findByText('Stokta 10 adet var, 12 çıkışı yapılamaz.'),
    ).toBeTruthy();
  });

  it('sıfır ve eksi miktarı sunucuya hiç göndermez', async () => {
    ciz();
    await hareketAc();
    fireEvent.change(screen.getByLabelText(/Miktar/), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Kaydet'));
    expect(await screen.findByText('Miktar sıfırdan büyük olmalı.')).toBeTruthy();
    expect(addMovement).not.toHaveBeenCalled();
  });
});

describe('Stok · para kaydı', () => {
  it('satış geliri hareketle aynı istekte gönderir', async () => {
    vi.mocked(addMovement).mockResolvedValue(
      hareket({ reason: 'satis', payment_id: 7 }),
    );
    ciz();
    await hareketAc();
    await turSec('Satış');
    fireEvent.change(screen.getByLabelText(/Miktar/), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      const [, body] = vi.mocked(addMovement).mock.calls[0];
      // Tutar ürünün satış fiyatından öneriliyor: 2 × 300.
      expect(body.money).toEqual({ amount: 600, method: 'cash', category_id: null });
      expect(body.delta).toBe(-2);
    });
  });

  it('giriş gideri kategorisiyle gönderir', async () => {
    vi.mocked(addMovement).mockResolvedValue(
      hareket({ reason: 'giris', expense_id: 4 }),
    );
    ciz();
    await hareketAc();
    fireEvent.change(await screen.findByLabelText(/Miktar/), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      const [, body] = vi.mocked(addMovement).mock.calls[0];
      // 10 × alış fiyatı (180), "Ürün & sarf" kategorisiyle.
      expect(body.money).toEqual({ amount: 1800, method: 'transfer', category_id: 1 });
    });
  });

  it('para kaydı kapatılınca hareket paraya dokunmuyor', async () => {
    vi.mocked(addMovement).mockResolvedValue(hareket({ reason: 'satis' }));
    ciz();
    await hareketAc();
    await turSec('Satış');
    fireEvent.click(screen.getByLabelText('Gelire de yaz'));
    fireEvent.change(screen.getByLabelText(/Miktar/), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() =>
      expect(vi.mocked(addMovement).mock.calls[0][1].money).toBeNull(),
    );
  });

  it('sayımda para alanı hiç sorulmuyor', async () => {
    ciz();
    await hareketAc();
    await turSec('Sayım');
    expect(screen.queryByLabelText('Gelire de yaz')).toBeNull();
    expect(screen.queryByLabelText('Gidere de yaz')).toBeNull();
  });

  it('geçmişte hangi hareketin paraya yazıldığını gösterir', async () => {
    vi.mocked(listMovements).mockResolvedValue([
      hareket({ reason: 'satis', payment_id: 7 }),
    ]);
    ciz();
    await hareketAc();
    expect(await screen.findByText(/gelire yazıldı/)).toBeTruthy();
  });
});

describe('Stok · geçmiş maliyet', () => {
  it('alış fiyatı değişmiş hareketin o günkü maliyetini yazar', async () => {
    // Ürünün güncel alışı 180; hareket 250'yken yapılmış.
    vi.mocked(listMovements).mockResolvedValue([
      hareket({ reason: 'satis', unit_cost: 250, payment_id: 3 }),
    ]);
    ciz();
    await hareketAc();
    expect(await screen.findByText(/o günkü alış ₺250/)).toBeTruthy();
  });

  it('fiyat değişmemişse fazladan bir şey yazmaz', async () => {
    vi.mocked(listMovements).mockResolvedValue([
      hareket({ reason: 'satis', unit_cost: 180 }),
    ]);
    ciz();
    await hareketAc();
    expect(screen.queryByText(/o günkü alış/)).toBeNull();
  });
});
