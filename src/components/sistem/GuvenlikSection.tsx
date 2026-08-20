import { useState } from 'react';
import { setTwoFactor } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../shell/Toast';

/**
 * İki adımlı doğrulama anahtarı.
 *
 * Ayar **kullanıcı başına**, klinik başına değil: ikinci bir operatör
 * eklendiğinde birinin diğerinin korumasını kapatabilmesi doğru olmaz. O
 * yüzden burada gösterilen, giriş yapmış kişinin kendi ayarı.
 */
export default function GuvenlikSection() {
  const { user, replaceUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kapatmak şifre istiyor; açmak istemiyor.
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState('');

  const on = user?.two_factor_enabled ?? false;

  const apply = (enabled: boolean, pwd = '') => {
    setBusy(true);
    setError(null);
    setTwoFactor(enabled, pwd)
      .then((u) => {
        replaceUser(u);
        setAsking(false);
        setPassword('');
        toast(enabled ? 'İki adımlı doğrulama açıldı.' : 'İki adımlı doğrulama kapatıldı.');
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-card)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>İki adımlı doğrulama</div>
            <div style={{ fontSize: 11, color: 'var(--ink-60)', marginTop: 3, lineHeight: 1.6 }}>
              Şifrenizden sonra <strong>{user?.email}</strong> adresine 6 haneli bir
              kod gönderiliyor. Şifreniz ele geçse bile posta kutunuza erişimi
              olmayan biri giremez.
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => (on ? setAsking(true) : apply(true))}
            aria-pressed={on}
            className="wl-btn wl-btn-sm"
            style={{
              flexShrink: 0,
              background: on ? 'var(--cream)' : 'var(--forest)',
              color: on ? 'var(--ink)' : 'var(--cream)',
              borderRadius: 8,
            }}
          >
            {on ? 'Kapat' : 'Aç'}
          </button>
        </div>

        {asking && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--ink-60)' }}>
              Kapatmak için şifrenizi girin — açık kalmış bir oturumu ele geçiren
              birinin korumayı tek tıkla kaldırmasını istemiyoruz.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password) apply(false, password);
                  if (e.key === 'Escape') setAsking(false);
                }}
                placeholder="Şifreniz"
                autoComplete="current-password"
                style={{
                  flex: 1, border: '1px solid var(--line-strong)', borderRadius: 8,
                  padding: '8px 10px', font: 'inherit', fontSize: 13,
                  background: 'var(--cream)',
                }}
              />
              <button
                type="button"
                className="wl-btn wl-btn-sm"
                disabled={busy || !password}
                onClick={() => apply(false, password)}
              >
                Kapat
              </button>
              <button
                type="button"
                className="wl-btn wl-btn-sm"
                onClick={() => {
                  setAsking(false);
                  setPassword('');
                  setError(null);
                }}
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 11, color: 'var(--bad)', marginTop: 10 }}>{error}</div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink-45)', lineHeight: 1.6 }}>
        Şifrenizi unutursanız giriş ekranındaki “Şifremi unuttum” bağlantısını
        kullanın; e-postanıza tek kullanımlık bir bağlantı gelir.
      </div>
    </div>
  );
}
