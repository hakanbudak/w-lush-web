import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getPublicConsent, signConsent, type PublicConsent,
} from '../api/consent';
import SignaturePad from '../components/ui/SignaturePad';
import './auth.css';

const trZaman = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit',
  })}`;
};

/** Danışanın onam formunu okuyup imzaladığı sayfa. Oturum yok. */
export default function OnamFormu() {
  const { token = '' } = useParams<{ token: string }>();

  const [form, setForm] = useState<PublicConsent | null>(null);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicConsent(token)
      .then((f) => {
        setForm(f);
        setName(f.customer_name);
      })
      .catch(() => setMissing(true));
  }, [token]);

  if (missing) {
    return (
      <Kabuk>
        <h1 className="wl-auth-title">Form bulunamadı</h1>
        <p className="wl-auth-sub">
          Bu bağlantı geçersiz. Lütfen merkezden yeni bir bağlantı isteyin.
        </p>
      </Kabuk>
    );
  }

  if (!form) {
    return (
      <Kabuk>
        <p className="wl-auth-sub">Yükleniyor…</p>
      </Kabuk>
    );
  }

  const imzala = () => {
    setBusy(true);
    setError(null);
    signConsent(token, name, signature)
      .then(setForm)
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <Kabuk baslik={form.clinic_name}>
      <h1 className="wl-auth-title">{form.title}</h1>

      <div
        style={{
          background: 'var(--paper)', border: '1px solid var(--line-strong)',
          borderRadius: 12, padding: '16px 18px', fontSize: 13, lineHeight: 1.7,
          whiteSpace: 'pre-wrap', marginTop: 14,
        }}
      >
        {form.body}
      </div>

      {form.signed ? (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              background: 'var(--forest-3)', color: 'var(--forest-2)',
              borderRadius: 10, padding: '12px 14px', fontSize: 12.5,
            }}
          >
            <strong>{form.signed_name}</strong> tarafından{' '}
            {form.signed_at ? trZaman(form.signed_at) : ''} tarihinde imzalandı.
          </div>
          {form.signature && (
            <img
              src={form.signature}
              alt={`${form.signed_name} imzası`}
              style={{
                marginTop: 10, maxWidth: '100%', borderRadius: 10,
                border: '1px solid var(--line)', background: 'var(--paper)',
              }}
            />
          )}
          <p style={{ fontSize: 11.5, color: 'var(--ink-45)', marginTop: 10 }}>
            Bu sayfayı saklayabilir ya da yazdırabilirsiniz.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>
            Adınız soyadınız
            <input
              className="wl-input"
              value={name}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>

          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-60)', marginBottom: 4 }}>
              İmzanız
            </div>
            <SignaturePad onChange={setSignature} />
          </div>

          {error && <p style={{ fontSize: 12.5, color: 'var(--bad)', margin: 0 }}>{error}</p>}

          <button
            type="button"
            className="wl-btn"
            style={{ width: '100%', borderRadius: 10 }}
            disabled={busy || !name.trim() || !signature}
            onClick={imzala}
          >
            {busy ? 'Kaydediliyor…' : 'Okudum, onaylıyorum'}
          </button>
          <p style={{ fontSize: 11.5, color: 'var(--ink-45)', margin: 0 }}>
            Onayladığınızda adınız, imzanız ve tarih kaydedilir. Bu form bir kez
            imzalanır.
          </p>
        </div>
      )}
    </Kabuk>
  );
}

function Kabuk({ baslik, children }: { baslik?: string; children: React.ReactNode }) {
  return (
    <div
      className="wl"
      style={{
        minHeight: '100vh', background: 'var(--cream)', display: 'flex',
        justifyContent: 'center', padding: '32px 16px',
      }}
    >
      <main style={{ width: '100%', maxWidth: 560 }}>
        {baslik && (
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{baslik}</div>
        )}
        {children}
      </main>
    </div>
  );
}
