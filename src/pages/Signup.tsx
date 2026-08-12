import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, ErrorBox, Field } from './Login';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signup({ clinic_name: clinicName, email, password, name });
      // Yeni klinik demo hizmetlerle açılıyor; sihirbaz onları kendi listesiyle
      // değiştiriyor. Atlanabilir.
      navigate('/kurulum', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Klinik kaydı oluştur" subtitle="Klinik bilgilerinizi girin, hemen başlayalım.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Klinik adı">
          <input
            className="wl-input"
            required
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder="Örn. w-lush Maslak"
          />
        </Field>
        <Field label="Adınız soyadınız">
          <input
            className="wl-input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </Field>
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
        <Field label="Şifre (en az 6 karakter)">
          <input
            className="wl-input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
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
          {busy ? 'Oluşturuluyor…' : 'Hesap Oluştur'}
        </button>
      </form>
      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--ink-60)' }}>
        Zaten hesabın var mı?{' '}
        <Link to="/login" style={{ color: 'var(--forest)', fontWeight: 500 }}>
          Giriş yap
        </Link>
      </div>
    </AuthShell>
  );
}
