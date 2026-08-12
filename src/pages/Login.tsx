import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/icons';
import './auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Hoş geldiniz" subtitle="Panele girmek için bilgilerinizi girin.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="E-posta">
          <input
            className="wl-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Şifre">
          <input
            className="wl-input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        {error && <ErrorBox text={error} />}
        <button
          type="submit"
          disabled={busy}
          className="wl-btn"
          style={{
            background: 'var(--forest)',
            color: 'var(--cream)',
            borderRadius: 8,
            justifyContent: 'center',
            height: 40,
            marginTop: 4,
          }}
        >
          {busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--ink-60)' }}>
        Hesabın yok mu?{' '}
        <Link to="/signup" style={{ color: 'var(--forest)', fontWeight: 500 }}>
          Klinik kaydı oluştur
        </Link>
      </div>
    </AuthShell>
  );
}

// --- Paylaşılan UI parçaları ---

function useIsWide(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 900,
  );
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return wide;
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const wide = useIsWide();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: wide ? '1.1fr 0.9fr' : '1fr',
        background: 'var(--cream)',
      }}
    >
      {wide && <AuthLeftPanel />}

      <div style={{ display: 'grid', placeItems: 'center', padding: 24, background: 'var(--cream)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {!wide && <AuthBrand />}
          <div style={{ marginBottom: 22 }}>
            <h1
              className="wl-display"
              style={{ fontSize: 25, fontWeight: 500, margin: 0, marginBottom: 6 }}
            >
              {title}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-60)', margin: 0 }}>{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Tek hero kartı — gerçek ürün hissi veren mini panel önizlemesi.
 *  Stripe/Linear tarzı: tek anlamlı görsel, dağınıklık yok.
 */
function ProductPreview() {
  const ROWS = [
    { time: '10:00', name: 'Hydrafacial', staff: 'Ebru B.',  status: 'tamam'  },
    { time: '13:00', name: 'Mezoterapi',  staff: 'Defne A.', status: 'onay'   },
    { time: '14:30', name: 'AI önerisi',  staff: 'boş slot', status: 'sparkle' },
    { time: '16:00', name: 'Botoks',      staff: 'Defne A.', status: 'onay'   },
  ];

  return (
    <div
      className="wl-auth-rise"
      style={{
        background: 'var(--paper)',
        borderRadius: 14,
        boxShadow:
          '0 30px 60px -20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)',
        overflow: 'hidden',
        color: 'var(--ink)',
        width: '100%',
        maxWidth: 380,
      }}
    >
      {/* başlık çubuğu */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ color: 'var(--forest)', display: 'flex' }}>{Icon.calendar}</span>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Bugün · 16 Mayıs</div>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: 'var(--ink-40)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          4 randevu
        </span>
      </div>

      {/* randevu satırları */}
      <div style={{ padding: '8px 6px' }}>
        {ROWS.map((r, i) => (
          <div
            key={r.time}
            className={i === 0 ? 'wl-auth-rise' : i === 1 ? 'wl-auth-rise-2' : 'wl-auth-rise-3'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              background: r.status === 'sparkle' ? 'var(--lavender-soft)' : 'transparent',
            }}
          >
            <span
              className="wl-mono"
              style={{ fontSize: 11, color: 'var(--ink-40)', width: 38 }}
            >
              {r.time}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{r.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-40)', marginTop: 1 }}>{r.staff}</div>
            </div>
            {r.status === 'tamam' && (
              <span style={{ color: 'var(--sage-2)', display: 'flex' }}>{Icon.check}</span>
            )}
            {r.status === 'onay' && (
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--cream)',
                  color: 'var(--ink-60)',
                  fontWeight: 500,
                }}
              >
                Onaylı
              </span>
            )}
            {r.status === 'sparkle' && (
              <span style={{ color: 'var(--lavender-2)', display: 'flex' }}>{Icon.sparkle}</span>
            )}
          </div>
        ))}
      </div>

      {/* alt — doluluk + gelir */}
      <div
        style={{
          padding: '14px 18px',
          borderTop: '1px solid var(--line)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Doluluk
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>%87</span>
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: 'var(--cream-2)',
              marginTop: 6,
              overflow: 'hidden',
            }}
          >
            <div className="wl-auth-bar-fill" style={{ ['--w' as never]: '87%' }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Bu hafta gelir
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>₺ 142.580</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--sage-2)', marginTop: 6 }}>↑ %12 önceki hafta</div>
        </div>
      </div>
    </div>
  );
}

function AuthBrand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div
        style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--forest)', color: 'var(--cream)',
          display: 'grid', placeItems: 'center',
          fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em',
        }}
      >
        w
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>w-lush</div>
        <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>klinik yönetim paneli</div>
      </div>
    </div>
  );
}

function AuthLeftPanel() {
  return (
    <div
      style={{
        background: 'var(--navy)',
        color: 'var(--navy-ink)',
        padding: '40px 56px 48px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Çok ince vertical grid (subtle texture, Linear stili) */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at 70% 50%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 70% 50%, black 30%, transparent 75%)',
          pointerEvents: 'none',
        }}
      />
      {/* Sol-üst subtle glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute', width: 640, height: 640, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 60%)',
          top: -260, left: -200,
          pointerEvents: 'none',
        }}
      />

      {/* Üst: brand + version chip yan yana */}
      <div
        style={{
          position: 'relative', zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--cream)', color: 'var(--forest)',
              display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 16,
              letterSpacing: '-0.02em',
            }}
          >
            w
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>w-lush</div>
        </div>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 10, padding: '4px 10px', borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.78)',
            border: '1px solid rgba(255,255,255,0.10)',
            letterSpacing: '0.06em',
          }}
        >
          <span className="wl-dot wl-auth-pulse" style={{ background: 'var(--sage)' }} />
          v1.0 · Aktif beta
        </div>
      </div>

      {/* Orta: manifesto + product preview yan yana grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr',
          alignItems: 'center',
          marginTop: 56,
          position: 'relative', zIndex: 2,
        }}
      >
        <div style={{ maxWidth: 460, marginBottom: 40 }}>
          <div
            style={{
              fontSize: 10, color: 'var(--sage)',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            Klinik Yönetim Sistemi
          </div>
          <h1
            style={{
              fontSize: 46, fontWeight: 500, lineHeight: 1.08,
              letterSpacing: '-0.032em', margin: 0,
            }}
          >
            Operasyonunuzun
            <br />
            <span style={{ fontWeight: 600 }}>yeni merkezi.</span>
          </h1>
          <p
            style={{
              fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7,
              margin: '22px 0 0', fontWeight: 400, maxWidth: 420,
            }}
          >
            Randevu, müşteri, hizmet, paket ve gelir — kliniğinizin günlük
            akışı için sade ve net bir panel.
          </p>
        </div>

        {/* Tek product preview kartı (hero görsel) */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <ProductPreview />
        </div>
      </div>

      {/* Alt: signature */}
      <div
        style={{
          position: 'relative', zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 32,
          fontSize: 11, color: 'rgba(255,255,255,0.45)',
        }}
      >
        <span>© 2026 w-lush</span>
        <span style={{ letterSpacing: '0.1em' }}>Made for modern clinics</span>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          color: 'var(--ink-40)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export function ErrorBox({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: 'var(--bad)',
        background: 'var(--cream)',
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      {text}
    </div>
  );
}
