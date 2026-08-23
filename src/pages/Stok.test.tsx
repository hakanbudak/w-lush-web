import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stok from './Stok';
import type { Product } from '../api/stock';

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

const urun = (over: Partial<Product> = {}): Product => ({
  id: 1, name: 'Şampuan', unit: 'adet', quantity: 10, min_quantity: 5,
  price: 300, cost: 180, active: true, sort_order: 0, ...over,
});

const ciz = () => render(<MemoryRouter><Stok /></MemoryRouter>);

beforeEach(() => {
  vi.mocked(listProducts).mockResolvedValue([urun()]);
  vi.mocked(listMovements).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const hareketAc = async () => {
  fireEvent.click(await screen.findByText('Hareket'));
};

/** Select seçenekleri onMouseDown ile seçiliyor (bkz. ui/OptionList). */
const turSec = async (etiket: string) => {
  fireEvent.click(screen.getByRole('combobox'));
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
    vi.mocked(addMovement).mockResolvedValue({
      id: 1, product_id: 1, delta: -3, reason: 'cikis', note: '',
      quantity_after: 7, created_at: '2026-08-24T10:00:00',
    });
    ciz();
    await hareketAc();
    await turSec('Çıkış');
    fireEvent.change(screen.getByLabelText(/Miktar/), { target: { value: '3' } });
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() =>
      expect(vi.mocked(addMovement).mock.calls[0][1]).toEqual({
        delta: -3, reason: 'cikis', note: '',
      }),
    );
  });

  it('sayımda sayılan toplam gider, farkı sunucu hesaplar', async () => {
    vi.mocked(countProduct).mockResolvedValue({
      id: 1, product_id: 1, delta: -3, reason: 'sayim', note: '',
      quantity_after: 7, created_at: '2026-08-24T10:00:00',
    });
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
