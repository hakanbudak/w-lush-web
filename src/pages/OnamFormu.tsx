import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getPublicConsent, requestConsentCode, signConsent, verifyConsentCode,
  type PublicConsent,
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
  const [info, setInfo] = useState<string | null>(null);
  /**
   * SMS koduyla onay. Varsayılan imza: SMS kodu güvenli elektronik imza
   * değil, yani ıslak imzanın yerini tutmuyor. Klinik hangi formlarda
   * kabul ettiğini kendisi seçiyor; sayfa da yalnızca izinliyse sunuyor.
   */
  const [sms, setSms] = useState(false);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

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

  const kodIste = () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    requestConsentCode(token)
      .then(() => {
        setCodeSent(true);
        setInfo('Onay kodu telefonunuza gönderildi.');
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const koduDogrula = () => {
    setBusy(true);
    setError(null);
    verifyConsentCode(token, name, code)
      .then(setForm)
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

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

          {sms ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!codeSent ? (
                <button
                  type="button"
                  className="wl-btn"
                  style={{ width: '100%', borderRadius: 10 }}
                  disabled={busy || !name.trim()}
                  onClick={kodIste}
                >
                  {busy ? 'Gönderiliyor…' : 'Telefonuma onay kodu gönder'}
                </button>
              ) : (
                <label style={{ fontSize: 11.5, color: 'var(--ink-60)' }}>
                  Onay kodu
                  <input
                    className="wl-input"
                    value={code}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="Onay kodu"
                    onChange={(e) => setCode(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-60)', marginBottom: 4 }}>
                İmzanız
              </div>
              <SignaturePad onChange={setSignature} />
            </div>
          )}

          {form.sms_allowed && (
            <button
              type="button"
              onClick={() => {
                setSms(!sms);
                setError(null);
                setInfo(null);
              }}
              style={{
                border: 'none', background: 'transparent', font: 'inherit',
                fontSize: 11.5, color: 'var(--ink-45)', cursor: 'pointer',
                padding: 0, textAlign: 'left',
              }}
            >
              {sms ? 'İmzayla onaylamak istiyorum' : 'SMS koduyla onaylamak istiyorum'}
            </button>
          )}

          {info && (
            <p style={{ fontSize: 12.5, color: 'var(--forest)', margin: 0 }}>{info}</p>
          )}
          {error && <p style={{ fontSize: 12.5, color: 'var(--bad)', margin: 0 }}>{error}</p>}

          {(!sms || codeSent) && (
            <button
              type="button"
              className="wl-btn"
              style={{ width: '100%', borderRadius: 10 }}
              disabled={
                busy || !name.trim() || (sms ? code.trim().length < 6 : !signature)
              }
              onClick={sms ? koduDogrula : imzala}
            >
              {busy ? 'Kaydediliyor…' : 'Okudum, onaylıyorum'}
            </button>
          )}
          <p style={{ fontSize: 11.5, color: 'var(--ink-45)', margin: 0 }}>
            {sms
              ? 'Onayladığınızda adınız, telefon numaranız, onay saati ve metnin' +
                ' bir özeti kaydedilir. Bu form bir kez onaylanır.'
              : 'Onayladığınızda adınız, imzanız ve tarih kaydedilir. Bu form bir' +
                ' kez imzalanır.'}
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
