import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { NAV } from '../config/nav';
import { useShellBadges } from '../hooks/useShellBadges';
import { useWhatsAppStatus } from '../hooks/useWhatsAppStatus';
import { Icon } from './icons';

const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const badges = useShellBadges();
  const wa = useWhatsAppStatus();

  return (
    <aside
      style={{
        width: 232,
        height: '100vh',
        background: 'var(--navy)',
        color: 'var(--navy-ink)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <NavLink
        to="/"
        style={{
          padding: '18px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'var(--forest)',
            color: 'var(--navy-ink)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          w
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>
            w-lush
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'rgba(244,242,236,0.5)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.clinic.name ?? ''}
          </span>
        </span>
      </NavLink>

      <nav style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((n) => {
          const badge =
            n.key === 'crm' ? badges.crm : n.key === 'mesajlar' ? badges.mesajlar : 0;
          return (
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
                color: isActive ? '#FFFFFF' : 'rgba(244,242,236,0.62)',
                background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    style={{
                      display: 'flex',
                      color: isActive ? 'var(--accent-soft)' : 'rgba(244,242,236,0.4)',
                    }}
                  >
                    {Icon[n.icon]}
                  </span>
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {badge > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: 'rgba(46,125,91,0.35)',
                        color: '#9ED0B5',
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid rgba(244,242,236,0.09)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            flexShrink: 0,
            background: wa.connected ? '#4ADE80' : 'rgba(244,242,236,0.35)',
          }}
        />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>WhatsApp</span>
        <span style={{ fontSize: 11, color: 'rgba(244,242,236,0.5)' }}>{wa.label}</span>
      </div>

      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid rgba(244,242,236,0.09)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--forest)',
            color: 'var(--navy-ink)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initials(user?.name || user?.email || '')}
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.name || '—'}
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'rgba(244,242,236,0.45)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.email ?? ''}
          </span>
        </span>
        <button
          type="button"
          onClick={logout}
          title="Çıkış yap"
          style={{
            display: 'flex',
            color: 'rgba(244,242,236,0.45)',
            padding: 4,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          {Icon.exit}
        </button>
      </div>
    </aside>
  );
}
