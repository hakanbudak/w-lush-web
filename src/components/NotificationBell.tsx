import { useCallback, useEffect, useRef, useState } from 'react';
import { unreadCount } from '../api/notifications';
import { Icon } from './icons';

/** Sekme görünürken sayaç bu aralıkla tazelenir (ms). */
const POLL_MS = 60_000;

/** Zil + okunmamış rozeti. Sayaç ucuz olduğu için sık, liste (Task 3) seyrek çekilir. */
export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={unread > 0 ? `Bildirimler (${unread} okunmamış)` : 'Bildirimler'}
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
              color: 'var(--ink)',
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
    </div>
  );
}
