import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
  type AppNotification,
  type NotificationKind,
} from '../api/notifications';
import { Icon } from './icons';
import { relativeTime } from '../utils/time';

/** Sekme görünürken sayaç bu aralıkla tazelenir (ms). */
const POLL_MS = 60_000;

const KIND_LABELS: Record<NotificationKind, string> = {
  booking: 'Yeni randevu',
  reschedule: 'Erteleme',
  cancellation: 'İptal',
  request: 'Talep',
  lapsed: 'Kayıp danışan',
};

const kindLabel = (kind: string): string =>
  KIND_LABELS[kind as NotificationKind] ?? 'Bildirim';

/** Zil + okunmamış rozeti. Sayaç ucuz olduğu için sık, liste (Task 3) seyrek çekilir. */
export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const navigate = useNavigate();
  // Yalnız en son isteğin sonucu items/loading'i güncelleyebilir; hızlı
  // aç/kapa/aç sırasında eski bir yanıt yeni olanı ezemez.
  const requestIdRef = useRef(0);

  const loadList = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    listNotifications()
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setItems(data);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setError('Bildirimler yüklenemedi.');
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoading(false);
      });
  }, []);

  // Hata yutulur: sayaç son bilinen değerde kalır, sıfırlanmaz.
  const refreshCount = useCallback(() => {
    unreadCount()
      .then(setUnread)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };
    window.addEventListener('focus', refreshCount);
    document.addEventListener('visibilitychange', onVisible);

    // Arka plandaki sekme istek atmaz.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshCount();
    }, POLL_MS);

    return () => {
      window.removeEventListener('focus', refreshCount);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [refreshCount]);

  // Panel her açıldığında taze liste.
  useEffect(() => {
    if (open) loadList();
    else setActionError(null);
  }, [open, loadList]);

  // Dışarı tıklayınca veya Escape'e basınca kapan (Sidebar'daki çıkış
  // popover'ıyla aynı desen).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function openItem(note: AppNotification) {
    if (!note.read) {
      markRead(note.id)
        .then(() => {
          setActionError(null);
          setItems((prev) =>
            prev.map((n) => (n.id === note.id ? { ...n, read: true } : n)),
          );
          setUnread((n) => Math.max(0, n - 1));
        })
        .catch(() => {
          setActionError('Okundu işaretlenemedi.');
          setOpen(true);
        });
    }
    setOpen(false);
    // Hedefi olan bildirim oraya gider; olmayan eskisi gibi takvime düşer.
    navigate(note.ref ? `/danisan/${encodeURIComponent(note.ref)}` : '/randevu');
  }

  function readAll() {
    markAllRead()
      .then(() => {
        setActionError(null);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnread(0);
      })
      .catch(() => setActionError('İşaretlenemedi.'));
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={unread > 0 ? `Bildirimler (${unread} okunmamış)` : 'Bildirimler'}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-60)',
          position: 'relative',
          cursor: 'pointer',
          border: 'none',
          background: 'transparent',
          padding: 0,
          font: 'inherit',
        }}
      >
        {Icon.bell}
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 999,
              background: 'var(--champagne-2)',
              border: '2px solid var(--paper)',
              color: 'var(--paper)',
              fontSize: 10,
              fontWeight: 600,
              lineHeight: '16px',
              textAlign: 'center',
              boxSizing: 'content-box',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            right: 0,
            width: 360,
            maxHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>Bildirimler</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 11,
                  color: 'var(--ink-60)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          {actionError && (
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--ink-60)' }}>
              {actionError}
            </div>
          )}

          <div style={{ overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
            )}

            {error && !loading && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-60)' }}>
                {error}{' '}
                <button
                  type="button"
                  onClick={loadList}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    fontFamily: 'inherit',
                    fontSize: 12,
                    color: 'var(--forest)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Tekrar dene
                </button>
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)', lineHeight: 1.5 }}>
                Henüz bildirim yok — WhatsApp’tan randevu geldiğinde burada görünür.
              </div>
            )}

            {!loading &&
              !error &&
              items.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => openItem(note)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: '1px solid var(--line)',
                    background: note.read ? 'transparent' : 'var(--cream)',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      marginTop: 6,
                      flexShrink: 0,
                      background: note.read ? 'transparent' : 'var(--champagne-2)',
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 10,
                        letterSpacing: '0.04em',
                        color: 'var(--ink-40)',
                      }}
                    >
                      {kindLabel(note.kind)} · {relativeTime(note.created_at)}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: 'var(--ink)',
                        lineHeight: 1.45,
                        marginTop: 2,
                      }}
                    >
                      {note.message}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
