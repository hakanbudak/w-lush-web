import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MetinlerSection from './MetinlerSection';
import { listTexts, saveText } from '../../api/texts';

vi.mock('../../api/texts', () => ({ listTexts: vi.fn(), saveText: vi.fn() }));

const ROWS = [
  {
    key: 'MENU_HEADER', label: 'Menü başlığı', group: 'Menü',
    fields: [], multiline: false, value: '', default: 'W-Lush ✨',
  },
  {
    key: 'MENU_GREETING', label: 'Selamlama', group: 'Menü',
    fields: ['ad'], multiline: false, value: 'Selam {ad}!', default: 'Merhaba {ad}! 👋',
  },
  {
    key: 'ASK_SERVICE', label: 'Hizmet sorusu', group: 'Randevu alma',
    fields: [], multiline: false, value: '', default: 'Hangi hizmet?',
  },
];

describe('MetinlerSection', () => {
  beforeEach(() => {
    // Çağrı sayacı testler arasında taşınıyordu: "boşuna kayıt yapmıyor"
    // testi bir önceki testin kaydını sayıp düşüyordu.
    vi.clearAllMocks();
    vi.mocked(listTexts).mockResolvedValue(structuredClone(ROWS));
    vi.mocked(saveText).mockImplementation((key, value) =>
      Promise.resolve({ ...ROWS.find((r) => r.key === key)!, value }),
    );
  });
  afterEach(cleanup);

  it('metinleri grubuna göre listeliyor', async () => {
    render(<MetinlerSection />);
    expect(await screen.findByText('Menü')).toBeTruthy();
    expect(screen.getByText('Randevu alma')).toBeTruthy();
  });

  it('yazılmamış metinde varsayılanı gösteriyor', async () => {
    render(<MetinlerSection />);
    await screen.findByText('Menü');
    expect(screen.getByText(/Varsayılan: W-Lush/)).toBeTruthy();
  });

  it('kullanılabilecek yer tutucuları gösteriyor', async () => {
    render(<MetinlerSection />);
    await screen.findByText('Menü');
    expect(screen.getByText('{ad}')).toBeTruthy();
  });

  it('alandan çıkınca kaydediyor', async () => {
    render(<MetinlerSection />);
    const field = await screen.findByLabelText('Menü başlığı');
    fireEvent.change(field, { target: { value: 'Lily ✨' } });
    fireEvent.blur(field);
    await waitFor(() => expect(saveText).toHaveBeenCalledWith('MENU_HEADER', 'Lily ✨'));
  });

  it('değişmemiş alanda boşuna kayıt yapmıyor', async () => {
    render(<MetinlerSection />);
    const field = await screen.findByLabelText('Menü başlığı');
    fireEvent.blur(field);
    expect(saveText).not.toHaveBeenCalled();
  });

  it('varsayılana dön sadece yazılmış metinde çıkıyor', async () => {
    render(<MetinlerSection />);
    await screen.findByText('Menü');
    // Üç satırdan yalnızca birinde (MENU_GREETING) yazılmış metin var.
    expect(screen.getAllByText('varsayılana dön')).toHaveLength(1);
  });

  it('varsayılana dön metni boşaltıyor', async () => {
    render(<MetinlerSection />);
    await screen.findByText('Menü');
    fireEvent.click(screen.getByText('varsayılana dön'));
    await waitFor(() => expect(saveText).toHaveBeenCalledWith('MENU_GREETING', ''));
  });

  it('sunucunun reddini gösteriyor', async () => {
    vi.mocked(saveText).mockRejectedValueOnce(new Error('Tanınmayan yer tutucu: {isim}.'));
    render(<MetinlerSection />);
    const field = await screen.findByLabelText('Menü başlığı');
    fireEvent.change(field, { target: { value: 'Selam {isim}' } });
    fireEvent.blur(field);
    expect(await screen.findByText(/Tanınmayan yer tutucu/)).toBeTruthy();
  });

  it('yüklenemezse hata gösteriyor', async () => {
    vi.mocked(listTexts).mockRejectedValueOnce(new Error('kopuk'));
    render(<MetinlerSection />);
    expect(await screen.findByText(/yüklenemedi/i)).toBeTruthy();
  });
});
