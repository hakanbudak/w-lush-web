import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

/** 1440×1024 stage + sol sidebar + üst bar + kaydırılabilir içerik. */
export default function Layout() {
  return (
    <div className="stage">
      <div
        className="wl"
        style={{ display: 'flex', width: '100%', height: '100vh', background: 'var(--cream)' }}
      >
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' }}>
          <TopBar />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              padding: 28,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
