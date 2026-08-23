import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnamFormu from './OnamFormu';
import type { PublicConsent } from '../api/consent';

vi.mock('../api/consent', () => ({
  getPublicConsent: vi.fn(),
  signConsent: vi.fn(),
}));
// Tuval jsdom'da çizmiyor; imza verisini bileşen yerine kabuk sağlıyor.
vi.mock('../components/ui/SignaturePad', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" onClick={() => onChange('data:image/png;base64,AAA')}>
      imzala-test
    </button>
  ),
}));

import { getPublicConsent, signConsent } from '../api/consent';

const FORM: PublicConsent = {
  clinic_name: 'Lush Güzellik',
  customer_name: 'Ayşe Yılmaz',
  title: 'Lazer epilasyon onamı',
  body: 'Bilgilendirildim ve kabul ediyorum.',
  signed: false, signed_name: '', signed_at: null, signature: '',
};

const ciz = () =>
  render(
    <MemoryRouter initialEntries={['/onam/abc']}>
      <Routes>
        <Route path="/onam/:token" element={<OnamFormu />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => vi.mocked(getPublicConsent).mockResolvedValue(FORM));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OnamFormu', () => {
  it('geçersiz bağlantıda merkeze yönlendirir', async () => {
    vi.mocked(getPublicConsent).mockRejectedValueOnce(new Error('yok'));
    ciz();
    expect(await screen.findByText('Form bulunamadı')).toBeTruthy();
  });

  it('metni ve danışanın adını gösterir', async () => {
    ciz();
    expect(await screen.findByText('Lazer epilasyon onamı')).toBeTruthy();
    expect(screen.getByText('Bilgilendirildim ve kabul ediyorum.')).toBeTruthy();
    expect(screen.getByDisplayValue('Ayşe Yılmaz')).toBeTruthy();
  });

  it('imza çizilmeden onay düğmesi çalışmıyor', async () => {
    ciz();
    const dugme = (await screen.findByText('Okudum, onaylıyorum')) as HTMLButtonElement;
    expect(dugme.disabled).toBe(true);
    fireEvent.click(screen.getByText('imzala-test'));
    expect((screen.getByText('Okudum, onaylıyorum') as HTMLButtonElement).disabled)
      .toBe(false);
  });

  it('imzalanınca kim ve ne zaman imzaladığını gösterir', async () => {
    vi.mocked(signConsent).mockResolvedValue({
      ...FORM, signed: true, signed_name: 'Ayşe Yılmaz',
      signed_at: '2026-08-24T10:30:00', signature: 'data:image/png;base64,AAA',
    });
    ciz();
    await screen.findByText('Okudum, onaylıyorum');
    fireEvent.click(screen.getByText('imzala-test'));
    fireEvent.click(screen.getByText('Okudum, onaylıyorum'));

    expect(await screen.findByText(/tarihinde imzalandı/)).toBeTruthy();
    expect(screen.queryByText('Okudum, onaylıyorum')).toBeNull();
  });

  it('zaten imzalı formu tekrar imzalatmıyor', async () => {
    vi.mocked(getPublicConsent).mockResolvedValue({
      ...FORM, signed: true, signed_name: 'Ayşe Yılmaz',
      signed_at: '2026-08-24T10:30:00', signature: 'data:image/png;base64,AAA',
    });
    ciz();
    expect(await screen.findByText(/tarihinde imzalandı/)).toBeTruthy();
    expect(screen.queryByText('imzala-test')).toBeNull();
  });

  it('sunucunun reddini olduğu gibi gösterir', async () => {
    vi.mocked(signConsent).mockRejectedValue(new Error('Bu form zaten imzalanmış.'));
    ciz();
    await screen.findByText('Okudum, onaylıyorum');
    fireEvent.click(screen.getByText('imzala-test'));
    fireEvent.click(screen.getByText('Okudum, onaylıyorum'));
    expect(await screen.findByText('Bu form zaten imzalanmış.')).toBeTruthy();
  });
});
