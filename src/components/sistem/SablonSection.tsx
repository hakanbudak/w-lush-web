import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api/clinic';
import { useToast } from '../shell/Toast';

interface Template {
  /** settings anahtarı: metin ve aç/kapa. */
  textKey: string;
  onKey: string;
  name: string;
  when: string;
  /** Boş bırakılırsa botun kullanacağı hazır metin. */
  placeholder: string;
  vars: string;
}

const TEMPLATES: Template[] = [
  {
    textKey: 'tmpl_reminder',
    onKey: 'tmpl_reminder_on',
    name: 'Randevu hatırlatma',
    when: '24 saat önce',
    placeholder: 'Merhaba {ad}, {tarih} {saat} randevunuzu hatırlatırız.',
    vars: '{ad} {tarih} {saat} {hizmet}',
  },
  {
    textKey: 'tmpl_confirmed',
    onKey: 'tmpl_confirmed_on',
    name: 'Randevu onayı',
    when: 'Randevu onaylanınca',
    placeholder: 'Randevunuz onaylandı ✅ {tarih} {saat} · {hizmet}',
    vars: '{ad} {tarih} {saat} {hizmet}',
  },
  {
    textKey: 'tmpl_followup',
    onKey: 'tmpl_followup_on',
    name: 'Kontrol çağrısı',
    when: 'Ziyaretten bir süre sonra',
    placeholder: 'Merhaba {ad}, kontrol randevusu için yazmanız yeterli.',
    vars: '{ad} {hizmet}',
  },
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 36,
        height: 21,
        borderRadius: 999,
        border: 'none',
        background: on ? 'var(--forest)' : 'var(--ink-20)',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 18 : 3,
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: 'var(--paper)',
          transition: 'left .18s ease',
        }}
      />
    </button>
  );
}

/**
 * Botun otomatik mesajları. Boş bırakılan metin, sistemin hazır metnini
 * kullanır — kutu boşken hiçbir mesaj kaybolmaz.
 */
export default function SablonSection() {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    getSettings()
      .then((s) => {
        const t: Record<string, string> = {};
        const f: Record<string, boolean> = {};
        for (const tpl of TEMPLATES) {
          t[tpl.textKey] = String(s[tpl.textKey] ?? '');
          f[tpl.onKey] = Boolean(s[tpl.onKey]);
        }
        setTexts(t);
        setFlags(f);
        setLoaded(true);
      })
      .catch(() => setError('Şablonlar yüklenemedi.'));
  }, []);

  const save = () => {
    setSaving(true);
    setError(null);
    updateSettings({ ...texts, ...flags })
      .then(() => toast('Şablonlar kaydedildi.'))
      .catch(() => setError('Kaydedilemedi.'))
      .finally(() => setSaving(false));
  };

  if (!loaded) {
    return <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      {TEMPLATES.map((t) => (
        <div
          key={t.textKey}
          style={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--cream-3)',
                color: 'var(--ink-60)',
              }}
            >
              {t.when}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              <Toggle
                on={flags[t.onKey] ?? false}
                onClick={() => setFlags((f) => ({ ...f, [t.onKey]: !f[t.onKey] }))}
              />
            </span>
          </div>

          <textarea
            value={texts[t.textKey] ?? ''}
            onChange={(e) => setTexts((x) => ({ ...x, [t.textKey]: e.target.value }))}
            placeholder={t.placeholder}
            rows={3}
            disabled={!flags[t.onKey]}
            style={{
              width: '100%',
              resize: 'vertical',
              border: '1px solid var(--line-strong)',
              borderRadius: 8,
              padding: '10px 12px',
              font: 'inherit',
              fontSize: 13,
              lineHeight: 1.5,
              background: flags[t.onKey] ? 'var(--wa-chip)' : 'var(--cream)',
              color: 'var(--ink)',
              opacity: flags[t.onKey] ? 1 : 0.6,
            }}
          />
          <div style={{ fontSize: 10, color: 'var(--ink-45)', marginTop: 6 }}>
            Değişkenler: {t.vars} · Boş bırakırsanız sistemin hazır metni gönderilir.
          </div>
        </div>
      ))}

      {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

      <div>
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Kaydediliyor…' : 'Şablonları kaydet'}
        </button>
      </div>
    </div>
  );
}
