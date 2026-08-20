import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SifreSifirla from './SifreSifirla';

const resetPassword = vi.fn();

vi.mock('../api/auth', () => ({
  resetPassword: (...a: unknown[]) => resetPassword(...a),
}));

beforeEach(() => resetPassword.mockReset().mockResolvedValue(undefined));
afterEach(cleanup);

const göster = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/sifre-sifirla${search}`]}>
      <Routes>
        <Route path="/sifre-sifirla" element={<SifreSifirla />} />
      </Routes>
    </MemoryRouter>,
  );

// Tam eşleşme şart: "Yeni şifre" ile "Yeni şifre (tekrar)" aynı öneki
// paylaşıyor, gevşek eşleşme ikisini birden buluyor.
const alan = (label: string) => screen.getByLabelText(label, { exact: true });

/** Formun kendisi: disabled butonu atlayıp gönderim yolunu sınamak için. */
const gonderim = () => screen.getByText('Şifreyi değiştir').closest('form') as HTMLFormElement;

describe('SifreSifirla', () => {
  it('jetonsuz açılırsa form göstermiyor', () => {
    göster('');
    expect(screen.getByText(/Bağlantı geçersiz/)).toBeTruthy();
    expect(screen.queryByText('Şifreyi değiştir')).toBeNull();
  });

  it('kısa şifreyi göndermiyor', () => {
    göster('?token=abc');
    fireEvent.change(alan('Yeni şifre'), { target: { value: 'kisa' } });
    fireEvent.change(alan('Yeni şifre (tekrar)'), { target: { value: 'kisa' } });

    // Buton zaten disabled; asıl korunması gereken formun kendi gönderimi
    // (Enter tuşu bu yoldan geçer).
    fireEvent.submit(gonderim());
    fireEvent.click(screen.getByText('Şifreyi değiştir'));

    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.getByText('Şifre en az 8 karakter olmalı.')).toBeTruthy();
  });

  it('iki şifre farklıysa göndermiyor', () => {
    göster('?token=abc');
    fireEvent.change(alan('Yeni şifre'), { target: { value: 'UzunSifre123' } });
    fireEvent.change(alan('Yeni şifre (tekrar)'), { target: { value: 'BaskaSifre123' } });
    fireEvent.submit(gonderim());
    expect(resetPassword).not.toHaveBeenCalled();
    expect(screen.getByText('İki şifre aynı değil.')).toBeTruthy();
  });

  it('geçerli şifreyi jetonla birlikte gönderiyor', async () => {
    göster('?token=jeton-123');
    fireEvent.change(alan('Yeni şifre'), { target: { value: 'UzunSifre123' } });
    fireEvent.change(alan('Yeni şifre (tekrar)'), { target: { value: 'UzunSifre123' } });
    fireEvent.click(screen.getByText('Şifreyi değiştir'));

    await screen.findByText(/Şifreniz değişti/);
    expect(resetPassword).toHaveBeenCalledWith('jeton-123', 'UzunSifre123');
  });
});
