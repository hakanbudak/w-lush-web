import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WhatsAppConnect from './WhatsAppConnect';

const getConnection = vi.fn();
const requestConnection = vi.fn();

vi.mock('../api/whatsapp', () => ({
  getConnection: () => getConnection(),
  requestConnection: (...a: unknown[]) => requestConnection(...a),
}));

const BOS = {
  status: 'none', phone_number_id: null, display_number: null,
  requested_at: null, connected_at: null, note: null, number_in_use: null,
};

beforeEach(() => {
  getConnection.mockReset().mockResolvedValue(BOS);
  requestConnection.mockReset().mockResolvedValue({ ...BOS, status: 'requested' });
});
afterEach(cleanup);

const numara = () => screen.getByPlaceholderText('+90 5xx xxx xx xx');
const gonder = () => screen.getByText('Bağlantı talebi gönder');

describe('WhatsAppConnect — talep', () => {
  it('numara ve WhatsApp durumu olmadan gönderilemiyor', async () => {
    render(<WhatsAppConnect />);
    await screen.findByText('WhatsApp henüz bağlı değil');

    expect(gonder().hasAttribute('disabled')).toBe(true);

    fireEvent.change(numara(), { target: { value: '905321110000' } });
    expect(gonder().hasAttribute('disabled')).toBe(true); // durum hâlâ seçilmedi

    fireEvent.click(screen.getByText('Hayır'));
    expect(gonder().hasAttribute('disabled')).toBe(false);
  });

  it('numara kullanımdaysa geçmişin kaybolacağını önceden söylüyor', async () => {
    render(<WhatsAppConnect />);
    await screen.findByText('WhatsApp henüz bağlı değil');

    fireEvent.click(screen.getByText('Evet, kullanılıyor'));

    expect(screen.getByText(/sohbet geçmişi kaybolur/)).toBeTruthy();
  });

  it('talep üç bilgiyi birden gönderiyor', async () => {
    render(<WhatsAppConnect />);
    await screen.findByText('WhatsApp henüz bağlı değil');

    fireEvent.change(numara(), { target: { value: '905321110000' } });
    fireEvent.click(screen.getByText('Hayır'));
    fireEvent.change(screen.getByPlaceholderText('Örn. hafta içi 14:00–17:00'), {
      target: { value: 'öğleden sonra' },
    });
    fireEvent.click(gonder());

    await waitFor(() => expect(requestConnection).toHaveBeenCalled());
    expect(requestConnection).toHaveBeenCalledWith({
      desired_number: '905321110000',
      note: 'öğleden sonra',
      number_in_use: false,
    });
  });

  it('bekleyen talepte sırada ne olduğu yazıyor', async () => {
    getConnection.mockResolvedValue({
      ...BOS, status: 'requested', display_number: '905321110000',
      requested_at: '2026-08-21T09:00:00Z', note: 'öğleden sonra',
    });
    render(<WhatsAppConnect />);

    await screen.findByText('Bağlantı talebin alındı');
    expect(screen.getByText(/Doğrulama kodu senin telefonuna gelecek/)).toBeTruthy();
    expect(screen.getByText(/905321110000/)).toBeTruthy();
  });

  it('bekleyen talepte kliniğin hazırlığı hatırlatılıyor', async () => {
    getConnection.mockResolvedValue({
      ...BOS, status: 'requested', display_number: '905321110000', number_in_use: true,
    });
    render(<WhatsAppConnect />);

    await screen.findByText('Bağlantı talebin alındı');
    expect(screen.getByText(/o hesabın silinmesi/)).toBeTruthy();
  });
});
