import type { ReactNode } from 'react';
import { Icon } from './icons';

/* örnek veri — prototip seçimleri */

/* ── genel modal kabuğu ── */
export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(42,53,48,0.32)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wl"
        style={{ width, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: '0 24px 80px -20px rgba(42,53,48,0.35)' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} className="wl-btn wl-btn-sm" style={{ width: 32, padding: 0, justifyContent: 'center', background: 'transparent', color: 'var(--ink-40)' }}>
            {Icon.x}
          </button>
        </div>
        <div style={{ padding: 20, overflow: 'auto' }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Mesaj gönder ── */
