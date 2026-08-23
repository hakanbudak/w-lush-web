import { useEffect, useState, type CSSProperties } from 'react';
import { getSettings, updateSettings } from '../../api/clinic';
import { useToast } from '../shell/Toast';
import RandevuAyarlari from './RandevuAyarlari';

const field: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '9px 10px',
  font: 'inherit',
  fontSize: 13,
  background: 'var(--cream)',
  marginTop: 4,
};

const labelStyle: CSSProperties = { fontSize: 11, color: 'var(--ink-60)', display: 'block' };

/** Tasarımın altı klinik tipi. Değer arayüzün dilini etkiler, iş kurallarını değil. */
/** Randevu ızgarasının adım aralığı. */
const INTERVALS = [15, 30, 45, 60];

export default function KlinikBilgisi() {
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [interval, setInterval] = useState(60);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    getSettings()
      .then((s) => {
        setPhone(String(s.clinic_phone ?? ''));
        setAddress(String(s.clinic_address ?? ''));
        setInterval(Number(s.slot_interval_minutes ?? 60));
        setLoaded(true);
      })
      .catch(() => setError('Klinik bilgisi yüklenemedi.'));
  }, []);

  const save = () => {
    setSaving(true);
    setError(null);
    updateSettings({
      clinic_phone: phone.trim(),
      clinic_address: address.trim(),
      slot_interval_minutes: interval,
    })
      .then(() => toast('Klinik bilgisi kaydedildi.'))
      .catch(() => setError('Kaydedilemedi.'))
      .finally(() => setSaving(false));
  };

  if (!loaded) {
    return <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 720 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <label style={labelStyle}>
          Telefon
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+90 212 555 00 00"
            style={field}
          />
        </label>

        <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
          Adres
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Mahalle, cadde, ilçe / il"
            style={field}
          />
        </label>

        {/* Bu iki alan artık gerçekten kullanılıyor; operatör doldurmanın
            neye yaradığını bilsin. */}
        <div
          style={{
            gridColumn: '1 / -1',
            fontSize: 11,
            color: 'var(--ink-60)',
            background: 'var(--cream)',
            borderRadius: 'var(--r-card)',
            padding: '10px 12px',
            lineHeight: 1.6,
          }}
        >
          {address.trim() || phone.trim() ? (
            <>
              WhatsApp'ta "neredesiniz?" diye soran danışana bot bu bilgiyi
              gönderiyor{address.trim() ? ', adres için harita bağlantısıyla birlikte' : ''}.
            </>
          ) : (
            <>
              Bu alanlar boşken bot "neredesiniz?" sorusunu yanıtlayamıyor ve
              soruyu ekibinize iletiyor. En sık gelen soru budur.
            </>
          )}
        </div>
      </div>

      <div>
        <div className="wl-label" style={{ marginBottom: 8 }}>
          Randevu aralığı
        </div>
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--cream)',
            borderRadius: 9,
            padding: 3,
          }}
        >
          {INTERVALS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setInterval(m)}
              className="wl-btn wl-btn-sm"
              style={{
                height: 28,
                borderRadius: 7,
                fontSize: 12,
                background: interval === m ? 'var(--paper)' : 'transparent',
                color: interval === m ? 'var(--ink)' : 'var(--ink-60)',
                boxShadow: interval === m ? '0 1px 2px rgba(23,35,61,0.12)' : 'none',
              }}
            >
              {m} dk
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-45)', marginTop: 6, lineHeight: 1.5 }}>
          Yeni saat önerilirken kullanılır. Aşağıdaki çalışma saatleri listesi elle
          düzenlenmeye devam eder — bu aralık onu değiştirmez.
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

      <div>
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Kaydediliyor…' : 'Klinik bilgisini kaydet'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
        <RandevuAyarlari />
      </div>
    </div>
  );
}
