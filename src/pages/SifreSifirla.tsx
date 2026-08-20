import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { AuthShell, ErrorBox, Field } from './Login';

/** Sunucudaki kuralla aynı; burada da söylüyoruz ki kullanıcı reddedilmeden bilsin. */
const MIN = 8;

export default function SifreSifirla() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN;
  const mismatch = again.length > 0 && password !== again;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN || password !== again) return;
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Bağlantı geçersiz" subtitle="Bu adreste sıfırlama jetonu yok.">
        <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.7 }}>
          Bağlantıyı postadan olduğu gibi açın ya da yeniden isteyin.
        </div>
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          <Link to="/sifremi-unuttum" style={{ color: 'var(--forest)' }}>
            Yeni bağlantı iste
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Şifreniz değişti" subtitle="Yeni şifrenizle giriş yapabilirsiniz.">
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="wl-btn"
          style={{
            background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8,
            justifyContent: 'center', height: 40, width: '100%',
          }}
        >
          Girişe git
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Yeni şifre belirleyin" subtitle={`En az ${MIN} karakter.`}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Yeni şifre">
          <input
            className="wl-input"
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Yeni şifre (tekrar)">
          <input
            className="wl-input"
            type="password"
            required
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        {tooShort && <ErrorBox text={`Şifre en az ${MIN} karakter olmalı.`} />}
        {mismatch && <ErrorBox text="İki şifre aynı değil." />}
        {error && <ErrorBox text={error} />}
        <button
          type="submit"
          disabled={busy || password.length < MIN || password !== again}
          className="wl-btn"
          style={{
            background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8,
            justifyContent: 'center', height: 40, marginTop: 4,
            opacity: password.length < MIN || password !== again ? 0.6 : 1,
          }}
        >
          {busy ? 'Kaydediliyor…' : 'Şifreyi değiştir'}
        </button>
      </form>
    </AuthShell>
  );
}
