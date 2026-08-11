import { useEffect, useState, type CSSProperties } from 'react';
import { ApiError } from '../../api/client';
import { listConversations, sendReply, type Conversation } from '../../api/conversations';
import { Modal } from '../modals';

const field: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '9px 10px',
  font: 'inherit',
  fontSize: 13,
  background: 'var(--cream)',
  marginTop: 4,
};

const labelStyle: CSSProperties = { fontSize: 11, color: 'var(--ink-60)', display: 'block' };

/**
 * Mevcut bir konuşmaya mesaj. Alıcı serbest bırakılmıyor: API yalnızca
 * kliniğin daha önce yazıştığı numaraya izin veriyor ve bu kasıtlı — hiç
 * yazışmamış birine serbest metin göndermek kliniğin WhatsApp numarasını
 * kapattırır.
 */
export default function SendMessageModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (name: string) => void;
}) {
  const [rows, setRows] = useState<Conversation[] | null>(null);
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listConversations()
      .then((r) => {
        setRows(r);
        if (r.length > 0) setPhone(r[0].phone);
      })
      .catch(() => setRows([]));
  }, []);

  const submit = () => {
    const body = text.trim();
    if (!phone) {
      setError('Alıcı seçilmeli.');
      return;
    }
    if (!body) {
      setError('Mesaj boş olamaz.');
      return;
    }
    setSending(true);
    setError(null);
    sendReply(phone, body)
      .then(() => {
        const who = rows?.find((r) => r.phone === phone);
        onSent(who?.customer_name || phone);
        onClose();
      })
      .catch((e: unknown) => {
        const api = e instanceof ApiError ? e : null;
        setError(api?.detail || 'Mesaj gönderilemedi.');
        setSending(false);
      });
  };

  const empty = rows !== null && rows.length === 0;

  return (
    <Modal title="Mesaj gönder" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {empty ? (
          <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.5 }}>
            Henüz hiç konuşma yok. WhatsApp'tan size yazan danışanlara buradan yanıt
            verebilirsiniz.
          </div>
        ) : (
          <>
            <label style={labelStyle}>
              Alıcı
              <select value={phone} onChange={(e) => setPhone(e.target.value)} style={field}>
                {(rows ?? []).map((r) => (
                  <option key={r.phone} value={r.phone}>
                    {r.customer_name || r.phone}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Mesaj
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                style={{ ...field, resize: 'vertical' }}
              />
            </label>
          </>
        )}

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onClose}>
            Vazgeç
          </button>
          {!empty && (
            <button
              type="button"
              className="wl-btn wl-btn-sm"
              onClick={submit}
              disabled={sending}
            >
              {sending ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
