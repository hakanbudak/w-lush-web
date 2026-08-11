import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { TopBarActionsProvider } from './shell/TopBarActions';

/** Uygulama kabuğu: sabit kenar menü + üst bar + kayan içerik. */
export default function Layout() {
  return (
    <TopBarActionsProvider>
      <div
        className="wl"
        style={{
          display: 'flex',
          width: '100%',
          height: '100vh',
          background: 'var(--cream)',
          overflow: 'hidden',
        }}
      >
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            height: '100vh',
          }}
        >
          <TopBar />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              padding: '20px 28px 28px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </TopBarActionsProvider>
  );
}
