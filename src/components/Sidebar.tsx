import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { NAV } from '../config/nav';
import { Icon } from './icons';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** 232px sol sidebar — referans dosyadan birebir, nav öğeleri router'a bağlı. */
export default function Sidebar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca popover kapansın
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const displayName = user?.name || user?.email || '—';
  const clinicName = user?.clinic.name || 'Klinik';

  return (
    <aside
      style={{
        width: 232,
        height: '100vh',
        background: 'var(--paper)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* brand */}
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--forest)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--cream)',
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: '-0.02em',
          }}
        >
          w
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>w-lush</div>
          <div
            style={{
              fontSize: 11, color: 'var(--ink-40)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title={clinicName}
          >
            {clinicName}
          </div>
        </div>
      </div>

      {/* nav items */}
      <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((n) => (
          <NavLink
            key={n.key}
            to={n.path}
            end={n.path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: 13,
              textDecoration: 'none',
              color: isActive ? 'var(--ink)' : 'var(--ink-60)',
              background: isActive ? 'var(--cream-2)' : 'transparent',
              fontWeight: isActive ? 500 : 400,
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? 'var(--forest)' : 'var(--ink-40)', display: 'flex' }}>
                  {Icon[n.icon]}
                </span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.count != null && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: 'var(--cream-3)',
                      color: 'var(--ink-60)',
                      fontFamily: 'Geist Mono, monospace',
                    }}
                  >
                    {n.count}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* AI block — pinned */}
      <div
        style={{
          padding: '12px 16px',
          margin: '16px 12px 0',
          borderRadius: 10,
          background: 'linear-gradient(135deg, var(--lavender-soft), var(--champagne-3))',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ color: 'var(--lavender-2)', display: 'flex' }}>{Icon.sparkle}</span>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lavender-2)' }}>AI Asistan</div>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 9,
              padding: '1px 5px',
              borderRadius: 4,
              background: 'rgba(125,111,163,0.18)',
              color: 'var(--lavender-2)',
              fontWeight: 600,
            }}
          >
            YENİ
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--lavender-2)', lineHeight: 1.4 }}>
          “Pınar K.’nın seansını yarına al ve hatırlatma gönder”
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* whatsapp status */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>WhatsApp</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--ink-40)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span className="wl-dot" style={{ background: 'var(--wa-green)' }} /> Bağlı · 12 yeni
          </div>
        </div>
      </div>

      {/* user */}
      <div
        ref={menuRef}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: 'var(--forest)',
            color: 'var(--cream)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {initials(displayName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={displayName}
          >
            {displayName}
          </div>
          <div
            style={{ fontSize: 10, color: 'var(--ink-40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={user?.email}
          >
            {user?.email}
          </div>
        </div>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          title="Hesap menüsü"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ink-40)', display: 'flex', padding: 4, borderRadius: 6,
          }}
        >
          {Icon.more}
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 4px)',
              right: 12,
              minWidth: 160,
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              boxShadow: '0 8px 24px -8px rgba(42,53,48,0.18)',
              padding: 4,
              zIndex: 10,
            }}
          >
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              style={{
                width: '100%', textAlign: 'left', background: 'transparent',
                border: 'none', cursor: 'pointer', padding: '8px 12px',
                borderRadius: 6, fontSize: 13, color: 'var(--bad)',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cream-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Çıkış yap
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
