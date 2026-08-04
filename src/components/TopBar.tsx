import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NAV } from '../config/nav';
import { Icon } from './icons';
import { MessageComposerModal, NewAppointmentModal } from './modals';

function todayLabel(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('tr-TR', { weekday: 'long' });
  const rest = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${weekday.charAt(0).toLocaleUpperCase('tr-TR')}${weekday.slice(1)} · ${rest}`;
}

function usePageTitle(): string {
  const { pathname } = useLocation();
  const match =
    NAV.find((n) => n.path !== '/' && pathname.startsWith(n.path)) ??
    NAV.find((n) => n.path === pathname) ??
    NAV[0];
  return match.title;
}

/** Üst bar — referans dosyadan birebir; başlık aktif rotaya göre. */
export default function TopBar() {
  const title = usePageTitle();
  const [modal, setModal] = useState<'msg' | 'appt' | null>(null);

  return (
    <>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 32px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--paper)',
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: 'var(--ink-40)', letterSpacing: '0.04em' }}>
          {todayLabel()}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 2 }}>
          {title}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 420, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 14, color: 'var(--ink-40)', display: 'flex' }}>
            {Icon.search}
          </span>
          <input
            placeholder="Danışan, randevu, fatura ara — ya da AI’a sor"
            style={{
              width: '100%',
              height: 36,
              padding: '0 56px 0 38px',
              border: '1px solid var(--line-strong)',
              borderRadius: 8,
              background: 'var(--cream)',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: 10,
              fontSize: 10,
              fontFamily: 'Geist Mono, monospace',
              color: 'var(--ink-40)',
              border: '1px solid var(--line-strong)',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--paper)',
            }}
          >
            ⌘K
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setModal('msg')}
          className="wl-btn wl-btn-ghost wl-btn-sm"
          style={{ borderRadius: 8 }}
        >
          <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
          Mesaj gönder
        </button>
        <button
          onClick={() => setModal('appt')}
          className="wl-btn wl-btn-sm"
          style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}
        >
          {Icon.plus}Yeni randevu
        </button>
        <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-60)',
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          {Icon.bell}
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: 999,
              background: 'var(--champagne-2)',
              border: '2px solid var(--paper)',
            }}
          />
        </div>
      </div>
    </div>

    {modal === 'msg' && <MessageComposerModal onClose={() => setModal(null)} />}
    {modal === 'appt' && <NewAppointmentModal onClose={() => setModal(null)} />}
    </>
  );
}
