import { useCallback, useEffect, useState } from 'react';
import {
  listConsentTemplates, listCustomerConsents, requestConsent,
  type ConsentSignature, type ConsentTemplate,
} from '../../api/consent';
import Select from '../ui/Select';

const trZaman = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit',
  })}`;
};

/**
 * Danışanın onam formları.
 *
 * İmzalanmamış form için bağlantı kopyalanıyor; danışan onu telefonundan
 * açıp imzalıyor. Resepsiyondaki tabletten de aynı bağlantı açılabiliyor —
 * ayrı bir "burada imzalat" akışı yazmak, iki yoldan birinin zamanla geri
 * kalması demekti.
 */
export default function CustomerConsents({
  phone, customerName,
}: {
  phone: string;
  customerName: string;
}) {
  const [rows, setRows] = useState<ConsentSignature[] | null>(null);
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    listCustomerConsents(phone)
      .then(setRows)
      .catch(() => setError('Onam kayıtları yüklenemedi.'));
  }, [phone]);

  useEffect(load, [load]);
  useEffect(() => {
    listConsentTemplates()
      .then((t) => setTemplates(t.filter((x) => x.active)))
      .catch(() => setTemplates([]));
  }, []);

  const link = (token: string) => `${window.location.origin}/onam/${token}`;

  const gonder = () => {
    if (!pick) return;
    setBusy(true);
    setError(null);
    requestConsent(Number(pick), phone, customerName)
      .then((out) => {
        setRows((r) => [out, ...(r ?? [])]);
        setPick('');
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const kopyala = (token: string) => {
    navigator.clipboard
      .writeText(link(token))
      .then(() => setCopied(token))
      .catch(() => setError('Kopyalanamadı — bağlantıyı elle seçebilirsiniz.'));
  };

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Select
          value={pick}
          onChange={setPick}
          options={templates.map((t) => ({ value: String(t.id), label: t.title }))}
          placeholder={templates.length === 0 ? 'Tanımlı form yok' : 'Onam formu seçin'}
          disabled={templates.length === 0}
          ariaLabel="Gönderilecek onam formu"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ borderRadius: 8 }}
          disabled={!pick || busy}
          onClick={gonder}
        >
          Form oluştur
        </button>
      </div>

      {templates.length === 0 && (
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-45)' }}>
          Önce Sistem → Onam formları'ndan bir metin tanımlayın.
        </p>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

      {rows !== null && rows.length === 0 && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-45)' }}>
          Bu danışan için onam kaydı yok.
        </p>
      )}

      {(rows ?? []).map((r) => (
        <div
          key={r.id}
          style={{
            border: '1px solid var(--line-strong)', borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r.title}</span>
            <span
              style={{
                fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                background: r.signed ? 'var(--forest-3)' : 'var(--warn-soft)',
                color: r.signed ? 'var(--forest-2)' : 'var(--warn)',
              }}
            >
              {r.signed ? 'İmzalandı' : 'Bekliyor'}
            </span>
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--ink-45)', marginTop: 4 }}>
            {r.signed && r.signed_at
              ? `${r.signed_name} · ${trZaman(r.signed_at)}`
              : `${trZaman(r.created_at)} tarihinde oluşturuldu`}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <a
              href={link(r.token)}
              target="_blank"
              rel="noreferrer"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ borderRadius: 8, textDecoration: 'none' }}
            >
              {r.signed ? 'İmzalı kopyayı aç' : 'Tablette imzalat'}
            </a>
            {!r.signed && (
              <button
                type="button"
                className="wl-btn wl-btn-ghost wl-btn-sm"
                style={{ borderRadius: 8 }}
                onClick={() => kopyala(r.token)}
              >
                {copied === r.token ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
