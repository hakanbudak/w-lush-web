import { useLocation } from 'react-router-dom';
import { NAV } from '../config/nav';
import NotificationBell from './NotificationBell';
import { useTopBarActions } from './shell/TopBarActions';

function todayLabel(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('tr-TR', { weekday: 'long' });
  const rest = now.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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

/** Üst bar. Sağdaki aksiyonlar sayfadan gelir (bkz. shell/TopBarActions). */
export default function TopBar() {
  const title = usePageTitle();
  const actions = useTopBarActions();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 28px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--paper)',
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: 'var(--ink-45)', letterSpacing: '0.04em' }}>
          {todayLabel()}
        </div>
        <div className="wl-display" style={{ fontSize: 19, marginTop: 1 }}>
          {title}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {actions}
        {actions && (
          <span
            style={{ width: 1, height: 22, background: 'var(--ink-20)', margin: '0 4px' }}
          />
        )}
        <NotificationBell />
      </div>
    </div>
  );
}
