import { useCallback, useEffect, useState } from 'react';
import {
  addNote,
  deleteNote,
  listNotes,
  type CustomerNote,
} from '../../api/customers';

/** "14 Ağu" — notun ne zaman öğrenildiği, notun kendisi kadar önemli. */
const noteDay = (iso: string): string =>
  new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

/**
 * Bir kişi hakkında yazılmış notlar. Hem danışan profilinde hem randevu
 * detayında aynı bileşen: not kişiye ait, randevuya değil, ve iki ekranın
 * ayrı ayrı yazılması ikisinin zamanla ayrışması demek olurdu.
 */
export default function CustomerNotes({ phone }: { phone: string }) {
  const [notes, setNotes] = useState<CustomerNote[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listNotes(phone)
      .then(setNotes)
      .catch(() => setError('Notlar yüklenemedi.'));
  }, [phone]);

  useEffect(() => {
    setNotes(null);
    setDraft('');
    setError(null);
    load();
  }, [load]);

  const save = () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError(null);
    addNote(phone, draft)
      .then((n) => {
        // Başa ekliyoruz: liste yeniden eskiye sıralı.
        setNotes((prev) => [n, ...(prev ?? [])]);
        setDraft('');
      })
      .catch(() => setError('Not kaydedilemedi.'))
      .finally(() => setBusy(false));
  };

  const remove = (id: number) => {
    setError(null);
    deleteNote(id)
      .then(() => setNotes((prev) => (prev ?? []).filter((n) => n.id !== id)))
      .catch(() => setError('Not silinemedi.'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter kaydeder, Shift+Enter satır atlar: not çoğunlukla tek
            // cümle, her seferinde fareye gitmek yorucu.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              save();
            }
          }}
          rows={2}
          placeholder="Hatırlanması gereken bir şey…"
          style={{
            flex: 1,
            minWidth: 0,
            border: '1px solid var(--line-strong)',
            borderRadius: 8,
            padding: '8px 10px',
            font: 'inherit',
            fontSize: 12.5,
            background: 'var(--cream)',
            resize: 'vertical',
          }}
        />
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          onClick={save}
          disabled={busy || !draft.trim()}
          style={{ opacity: draft.trim() ? 1 : 0.5 }}
        >
          Ekle
        </button>
      </div>

      {error && <div style={{ fontSize: 11, color: 'var(--bad)' }}>{error}</div>}

      {notes === null && !error && (
        <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Yükleniyor…</div>
      )}

      {notes !== null && notes.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>
          Henüz not yok. Telefonda öğrenilen şeyler burada kalıcı olur.
        </div>
      )}

      {(notes ?? []).map((n) => (
        <div
          key={n.id}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '8px 0',
            borderTop: '1px solid var(--line)',
          }}
        >
          <span
            className="wl-mono"
            style={{ fontSize: 10.5, color: 'var(--ink-40)', flexShrink: 0, marginTop: 2 }}
          >
            {noteDay(n.created_at)}
          </span>
          <span style={{ fontSize: 12.5, flex: 1, minWidth: 0, whiteSpace: 'pre-wrap' }}>
            {n.body}
          </span>
          <button
            type="button"
            onClick={() => remove(n.id)}
            aria-label="Notu sil"
            style={{
              border: 'none',
              background: 'transparent',
              font: 'inherit',
              fontSize: 11,
              color: 'var(--ink-45)',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >
            sil
          </button>
        </div>
      ))}
    </div>
  );
}
