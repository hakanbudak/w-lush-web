// Token yoksa /login'e yönlendirir; /me yüklenirken kısa loading.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--cream)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-40)',
          fontSize: 13,
        }}
      >
        Yükleniyor…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return <Outlet />;
}
