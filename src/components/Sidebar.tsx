import { NavLink } from 'react-router-dom';
import { NAV } from '../config/nav';
import { Icon } from './icons';

/** 232px sol sidebar — referans dosyadan birebir, nav öğeleri router'a bağlı. */
export default function Sidebar() {
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>w-lush</div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Maslak şubesi</div>
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
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
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
          DA
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Defne Aydın
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-40)' }}>Yönetici</div>
        </div>
        <span style={{ color: 'var(--ink-40)', display: 'flex', cursor: 'pointer' }}>{Icon.more}</span>
      </div>
    </aside>
  );
}
