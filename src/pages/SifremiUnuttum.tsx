import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import { AuthShell, ErrorBox, Field } from './Login';

/**
 * Şifre sıfırlama isteği.
 *
 * Gönderildikten sonra hep aynı şey yazıyor — adresin kayıtlı olup olmadığını
 * söylemiyoruz. Söylemek, isteyene hangi e-postaların sistemde olduğunu
 * saydırırdı; sunucu da aynı sebeple aynı cevabı veriyor.
 */
export default function SifremiUnuttum() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Postanızı kontrol edin"
        subtitle="Adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi."
      >
        <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.7 }}>
          Bağlantı <strong>1 saat</strong> geçerli ve bir kez kullanılabilir.
          Gelmediyse spam klasörünü kontrol edin.
        </div>
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          <Link to="/login" style={{ color: 'var(--forest)' }}>
            Girişe dön
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Şifremi unuttum"
      subtitle="Kayıtlı e-posta adresinizi yazın, sıfırlama bağlantısı gönderelim."
    >
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="E-posta">
          <input
            className="wl-input"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        {error && <ErrorBox text={error} />}
        <button
          type="submit"
          disabled={busy}
          className="wl-btn"
          style={{
            background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8,
            justifyContent: 'center', height: 40, marginTop: 4,
          }}
        >
          {busy ? 'Gönderiliyor…' : 'Bağlantı gönder'}
        </button>
      </form>
      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--ink-60)' }}>
        <Link to="/login" style={{ color: 'var(--forest)' }}>
          Girişe dön
        </Link>
      </div>
    </AuthShell>
  );
}
