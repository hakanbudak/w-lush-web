import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnamFormu from './OnamFormu';
import type { PublicConsent } from '../api/consent';

vi.mock('../api/consent', () => ({
  getPublicConsent: vi.fn(),
  signConsent: vi.fn(),
  requestConsentCode: vi.fn(),
  verifyConsentCode: vi.fn(),
}));
// Tuval jsdom'da çizmiyor; imza verisini bileşen yerine kabuk sağlıyor.
vi.mock('../components/ui/SignaturePad', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" onClick={() => onChange('data:image/png;base64,AAA')}>
      imzala-test
    </button>
  ),
}));

import {
  getPublicConsent, requestConsentCode, signConsent, verifyConsentCode,
} from '../api/consent';

const FORM: PublicConsent = {
  clinic_name: 'Lush Güzellik',
  customer_name: 'Ayşe Yılmaz',
  title: 'Lazer epilasyon onamı',
  body: 'Bilgilendirildim ve kabul ediyorum.',
  signed: false, signed_name: '', signed_at: null, signature: '',
  sms_allowed: false, signed_by_sms: false,
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

describe('SMS ile onay', () => {
  const smsForm = { ...FORM, sms_allowed: true };

  beforeEach(() => {
    vi.mocked(getPublicConsent).mockResolvedValue(smsForm);
    vi.mocked(requestConsentCode).mockResolvedValue(undefined);
    vi.mocked(verifyConsentCode).mockResolvedValue({
      ...smsForm, signed: true, signed_by_sms: true,
      signed_name: 'Ayşe Yılmaz', signed_at: '2026-09-08T12:00:00Z',
    });
  });

  it('izin verilmeyen formda seçenek çıkmıyor', async () => {
    vi.mocked(getPublicConsent).mockResolvedValue(FORM);
    ciz();
    await screen.findByText('Lazer epilasyon onamı');
    expect(screen.queryByText(/SMS koduyla onaylamak/)).toBeNull();
  });

  it('izin verilen formda seçenek çıkıyor', async () => {
    ciz();
    expect(await screen.findByText(/SMS koduyla onaylamak/)).toBeTruthy();
  });

  it('ad boşaltılırsa kod istenemiyor', async () => {
    // Ad formdan önceden doluyor; danışan silerse kod istenememeli.
    ciz();
    fireEvent.click(await screen.findByText(/SMS koduyla onaylamak/));
    fireEvent.change(screen.getByLabelText(/Adınız/), { target: { value: '' } });
    const dugme = screen.getByText(/onay kodu gönder/i) as HTMLButtonElement;
    expect(dugme.disabled).toBe(true);
  });

  it('kod isteyince gönderildiğini söylüyor', async () => {
    ciz();
    fireEvent.click(await screen.findByText(/SMS koduyla onaylamak/));
    fireEvent.change(screen.getByLabelText(/Adınız/), {
      target: { value: 'Ayşe Yılmaz' },
    });
    fireEvent.click(screen.getByText(/onay kodu gönder/i));
    expect(await screen.findByText(/telefonunuza gönderildi/i)).toBeTruthy();
  });

  it('kodu doğrulayınca formu onaylıyor', async () => {
    ciz();
    fireEvent.click(await screen.findByText(/SMS koduyla onaylamak/));
    fireEvent.change(screen.getByLabelText(/Adınız/), {
      target: { value: 'Ayşe Yılmaz' },
    });
    fireEvent.click(screen.getByText(/onay kodu gönder/i));
    const alan = await screen.findByLabelText('Onay kodu');
    fireEvent.change(alan, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Okudum, onaylıyorum'));

    expect(await screen.findByText(/tarihinde imzalandı/)).toBeTruthy();
    expect(verifyConsentCode).toHaveBeenCalledWith(
      expect.any(String), 'Ayşe Yılmaz', '123456',
    );
  });

  it('eksik kodla onaylanamıyor', async () => {
    ciz();
    fireEvent.click(await screen.findByText(/SMS koduyla onaylamak/));
    fireEvent.change(screen.getByLabelText(/Adınız/), {
      target: { value: 'Ayşe Yılmaz' },
    });
    fireEvent.click(screen.getByText(/onay kodu gönder/i));
    const alan = await screen.findByLabelText('Onay kodu');
    fireEvent.change(alan, { target: { value: '123' } });
    expect((screen.getByText('Okudum, onaylıyorum') as HTMLButtonElement).disabled)
      .toBe(true);
  });

  it('sunucunun reddini gösteriyor', async () => {
    vi.mocked(requestConsentCode).mockRejectedValueOnce(
      new Error('Bu form SMS ile onaylanamıyor, imza gerekiyor.'),
    );
    ciz();
    fireEvent.click(await screen.findByText(/SMS koduyla onaylamak/));
    fireEvent.change(screen.getByLabelText(/Adınız/), {
      target: { value: 'Ayşe Yılmaz' },
    });
    fireEvent.click(screen.getByText(/onay kodu gönder/i));
    expect(await screen.findByText(/imza gerekiyor/)).toBeTruthy();
  });

  it('imzaya geri dönülebiliyor', async () => {
    ciz();
    fireEvent.click(await screen.findByText(/SMS koduyla onaylamak/));
    fireEvent.click(screen.getByText(/İmzayla onaylamak/));
    expect(screen.getByText('imzala-test')).toBeTruthy();
  });
});
