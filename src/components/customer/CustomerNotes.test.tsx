import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerNotes from './CustomerNotes';

const listNotes = vi.fn();
const addNote = vi.fn();
const deleteNote = vi.fn();

vi.mock('../../api/customers', () => ({
  listNotes: (...a: unknown[]) => listNotes(...a),
  addNote: (...a: unknown[]) => addNote(...a),
  deleteNote: (...a: unknown[]) => deleteNote(...a),
}));

const NOTES = [
  { id: 2, body: 'Kızkardeşi de geliyor', created_at: '2026-08-14T09:00:00Z' },
  { id: 1, body: 'Fiyata hassas', created_at: '2026-08-02T09:00:00Z' },
];

beforeEach(() => {
  listNotes.mockReset().mockResolvedValue(NOTES);
  addNote.mockReset();
  deleteNote.mockReset().mockResolvedValue(undefined);
});

afterEach(cleanup);

const box = () => screen.getByPlaceholderText('Hatırlanması gereken bir şey…');

describe('CustomerNotes', () => {
  it('kişinin notlarını yükler', async () => {
    render(<CustomerNotes phone="905321112233" />);
    await screen.findByText('Fiyata hassas');
    expect(listNotes).toHaveBeenCalledWith('905321112233');
  });

  it('boş notu göndermez', async () => {
    render(<CustomerNotes phone="905321112233" />);
    await screen.findByText('Fiyata hassas');
    fireEvent.change(box(), { target: { value: '   ' } });

    // Buton zaten disabled; asıl korunması gereken yol Enter.
    fireEvent.keyDown(box(), { key: 'Enter' });
    fireEvent.click(screen.getByText('Ekle'));

    expect(addNote).not.toHaveBeenCalled();
  });

  it('Enter kaydeder ve not listenin başına girer', async () => {
    addNote.mockResolvedValue({ id: 3, body: 'Yeni not', created_at: '2026-08-15T09:00:00Z' });
    render(<CustomerNotes phone="905321112233" />);
    await screen.findByText('Fiyata hassas');

    fireEvent.change(box(), { target: { value: 'Yeni not' } });
    fireEvent.keyDown(box(), { key: 'Enter' });

    await screen.findByText('Yeni not');
    expect(addNote).toHaveBeenCalledWith('905321112233', 'Yeni not');
    // Liste yeniden eskiye: en yeni not ilk satırda.
    const bodies = screen.getAllByText(/not|hassas|geliyor/).map((e) => e.textContent);
    expect(bodies[0]).toBe('Yeni not');
  });

  it('Shift+Enter kaydetmez, satır atlar', async () => {
    render(<CustomerNotes phone="905321112233" />);
    await screen.findByText('Fiyata hassas');
    fireEvent.change(box(), { target: { value: 'İki satırlı' } });
    fireEvent.keyDown(box(), { key: 'Enter', shiftKey: true });
    expect(addNote).not.toHaveBeenCalled();
  });

  it('not silinebilir', async () => {
    render(<CustomerNotes phone="905321112233" />);
    await screen.findByText('Fiyata hassas');

    fireEvent.click(screen.getAllByLabelText('Notu sil')[1]);
    await waitFor(() => expect(screen.queryByText('Fiyata hassas')).toBeNull());
    expect(deleteNote).toHaveBeenCalledWith(1);
  });

  it('kaydedilemeyen not sessizce kaybolmaz', async () => {
    addNote.mockRejectedValue(new Error('boom'));
    render(<CustomerNotes phone="905321112233" />);
    await screen.findByText('Fiyata hassas');

    fireEvent.change(box(), { target: { value: 'Gitmeyecek' } });
    fireEvent.keyDown(box(), { key: 'Enter' });

    await screen.findByText('Not kaydedilemedi.');
    // Yazılan metin alanda duruyor: operatör tekrar yazmak zorunda kalmasın.
    expect((box() as HTMLTextAreaElement).value).toBe('Gitmeyecek');
  });

  it('not yokken ne yapılacağını söyler', async () => {
    listNotes.mockResolvedValue([]);
    render(<CustomerNotes phone="905321112233" />);
    await screen.findByText(/Henüz not yok/);
  });
});
