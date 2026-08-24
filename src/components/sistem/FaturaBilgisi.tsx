import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api/clinic';

const ALANLAR: { key: string; label: string; hint?: string; width?: number }[] = [
  { key: 'invoice_title', label: 'Ünvan', hint: 'Faturada görünecek tam ad' },
  { key: 'invoice_tax_id', label: 'VKN / TCKN', hint: 'Kurum 10, şahıs 11 hane', width: 200 },
  { key: 'invoice_tax_office', label: 'Vergi dairesi', width: 220 },
  { key: 'invoice_address', label: 'Adres' },
  { key: 'invoice_district', label: 'İlçe', width: 180 },
  { key: 'invoice_city', label: 'İl', width: 180 },
  { key: 'invoice_prefix', label: 'Fatura öneki', hint: 'Üç harf, örn. WLS', width: 140 },
];

/**
 * Faturadaki satıcı bilgileri.
 *
 * Hepsi zorunlu ve boş başlıyor: uydurulmuş bir ünvan ya da VKN ile
 * üretilen XML'i hiçbir portal kabul etmiyor ve klinik hatayı ancak
 * yüklerken görürdü.
 */
export default function FaturaBilgisi() {
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        const rec = s as unknown as Record<string, unknown>;
        setValues(
          Object.fromEntries(
            ALANLAR.map((a) => [a.key, String(rec[a.key] ?? '')]),
          ),
        );
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const kaydet = () => {
    if (!values) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    updateSettings({ ...values, invoice_prefix: values.invoice_prefix.toUpperCase() })
      .then(() => setSaved(true))
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  if (!values) {
    return <p style={{ fontSize: 12.5, color: 'var(--ink-45)' }}>Yükleniyor…</p>;
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>Fatura bilgileri</div>
      <p style={{ fontSize: 11.5, color: 'var(--ink-45)', margin: '2px 0 14px' }}>
        Faturalar UBL-TR 1.2 biçiminde üretiliyor; dosyayı indirip kendi
        e-fatura portalınıza yüklersiniz. Bu alanların hepsi zorunlu —
        eksik biriyle üretilen faturayı portal kabul etmiyor.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {ALANLAR.map((a) => (
          <label
            key={a.key}
            style={{
              fontSize: 11, color: 'var(--ink-60)', display: 'flex',
              flexDirection: 'column', gap: 4,
              flex: a.width ? undefined : '1 1 260px',
            }}
          >
            {a.label}
            <input
              className={a.key === 'invoice_tax_id' ? 'wl-input wl-mono' : 'wl-input'}
              value={values[a.key]}
              style={{ width: a.width }}
              onChange={(e) => {
                setSaved(false);
                setValues({ ...values, [a.key]: e.target.value });
              }}
            />
            {a.hint && (
              <span style={{ fontSize: 10.5, color: 'var(--ink-40)' }}>{a.hint}</span>
            )}
          </label>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 10 }}>{error}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ borderRadius: 8 }}
          disabled={busy}
          onClick={kaydet}
        >
          {busy ? '…' : 'Kaydet'}
        </button>
        {saved && (
          <span style={{ fontSize: 12, color: 'var(--forest-2)' }}>Kaydedildi.</span>
        )}
      </div>
    </div>
  );
}
