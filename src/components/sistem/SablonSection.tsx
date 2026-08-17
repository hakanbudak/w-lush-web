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
  /**
   * Bu metin gerçekten müşteriye gidiyor mu. Gitmiyorsa neden gitmediği
   * yazılıyor: klinik burada bir metin yazıp gönderildiğini sanmasın.
   */
  live: boolean;
  note?: string;
  /** Onaylı Meta şablonunun adını tutan ayar; varsa alan gösteriliyor. */
  nameKey?: string;
  daysKey?: string;
}

const TEMPLATES: Template[] = [
  {
    textKey: 'tmpl_reminder',
    onKey: 'tmpl_reminder_on',
    name: 'Randevu hatırlatma',
    when: '24 saat önce',
    placeholder: 'Merhaba {ad}, {tarih} {saat} randevunuzu hatırlatırız.',
    vars: '{ad} {tarih} {saat} {hizmet}',
    live: false,
    note:
      'Hatırlatma, randevudan 24 saat önce gidiyor — yani WhatsApp\'ın 24 saatlik ' +
      'yanıt penceresinin dışında. Orada yalnızca Meta\'nın onayladığı şablonlar ' +
      'teslim ediliyor, metni Meta belirliyor. Şablon adını AI bölümündeki ' +
      '"Otomatik randevu hatırlatma" anahtarının altına yazın.',
  },
  {
    textKey: 'tmpl_confirmed',
    onKey: 'tmpl_confirmed_on',
    name: 'Randevu onayı',
    when: 'Randevu onaylanınca',
    placeholder: 'Randevunuz onaylandı ✅ {tarih} {saat} · {hizmet}',
    vars: '{ad} {tarih} {saat} {hizmet}',
    live: true,
  },
  {
    textKey: 'tmpl_followup',
    onKey: 'tmpl_followup_on',
    name: 'Kontrol çağrısı',
    when: 'Ziyaretten bir süre sonra',
    placeholder: 'Merhaba {ad}, kontrol randevusu için yazmanız yeterli.',
    vars: '{ad} {hizmet}',
    live: true,
    nameKey: 'followup_template_name',
    daysKey: 'followup_days_after',
    note:
      'Ziyaretten günler sonra gittiği için 24 saatlik yanıt penceresi kapalı: ' +
      'metni Meta\'nın onayladığı şablon belirliyor. Şablonun gövdesi iki ' +
      'değişken alıyor — {ad} ve {hizmet}. Şablon adı boşken hiçbir şey ' +
      'gönderilmiyor.',
  },
];

const smallField: React.CSSProperties = {
  marginLeft: 8,
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '6px 8px',
  font: 'inherit',
  fontSize: 13,
  background: 'var(--cream)',
};

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
  // Onaylı şablonun adı ve gecikmesi; yalnızca kontrol çağrısında var.
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    getSettings()
      .then((s) => {
        const t: Record<string, string> = {};
        const f: Record<string, boolean> = {};
        const x: Record<string, string> = {};
        for (const tpl of TEMPLATES) {
          t[tpl.textKey] = String(s[tpl.textKey] ?? '');
          f[tpl.onKey] = Boolean(s[tpl.onKey]);
          if (tpl.nameKey) x[tpl.nameKey] = String(s[tpl.nameKey] ?? '');
          if (tpl.daysKey) x[tpl.daysKey] = String(s[tpl.daysKey] ?? '');
        }
        setTexts(t);
        setFlags(f);
        setExtra(x);
        setLoaded(true);
      })
      .catch(() => setError('Şablonlar yüklenemedi.'));
  }, []);

  const save = () => {
    setSaving(true);
    setError(null);
    // Gün sayısı metin olarak tutuluyor (boş alan yazılabilsin diye), giderken
    // sayıya çevriliyor; taban 1, aynı gün "kontrol" sayılmaz.
    const numbers: Record<string, number> = {};
    for (const tpl of TEMPLATES) {
      if (tpl.daysKey) numbers[tpl.daysKey] = Math.max(1, Number(extra[tpl.daysKey]) || 7);
    }
    const names: Record<string, string> = {};
    for (const tpl of TEMPLATES) {
      if (tpl.nameKey) names[tpl.nameKey] = (extra[tpl.nameKey] ?? '').trim();
    }
    updateSettings({ ...texts, ...flags, ...names, ...numbers })
      .then(() => toast('Şablonlar kaydedildi.'))
      .catch(() => setError('Kaydedilemedi.'))
      .finally(() => setSaving(false));
  };

  if (!loaded) {
    return <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      <div
        style={{
          background: 'var(--cream)',
          borderRadius: 'var(--r-card)',
          padding: '12px 14px',
          fontSize: 11.5,
          color: 'var(--ink-60)',
          lineHeight: 1.6,
        }}
      >
        <strong>Randevu onayı</strong> sizin yazdığınız metinle gidiyor.
        <strong>Kontrol çağrısı</strong> gidiyor ama metnini Meta'nın onayladığı
        şablon belirliyor — aşağıya şablon adını yazın. <strong>Hatırlatma</strong>
        için de aynısı geçerli; onun şablon adı AI bölümünde.
      </div>
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
            {!t.live && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: 999,
                  background: 'var(--neutral-soft)',
                  color: 'var(--neutral)',
                }}
              >
                Gönderilmiyor
              </span>
            )}
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
          {t.nameKey && flags[t.onKey] && (
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
                Onaylı şablon adı
                <input
                  value={extra[t.nameKey] ?? ''}
                  placeholder="kontrol_cagrisi"
                  onChange={(e) =>
                    setExtra((x) => ({ ...x, [t.nameKey as string]: e.target.value }))
                  }
                  style={{ ...smallField, width: 190 }}
                />
              </label>
              {t.daysKey && (
                <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
                  Ziyaretten kaç gün sonra
                  <input
                    type="number"
                    min={1}
                    value={extra[t.daysKey] ?? ''}
                    onChange={(e) =>
                      setExtra((x) => ({ ...x, [t.daysKey as string]: e.target.value }))
                    }
                    style={{ ...smallField, width: 80 }}
                  />
                </label>
              )}
              {!(extra[t.nameKey] ?? '').trim() && (
                <div style={{ fontSize: 10.5, color: 'var(--warn)', alignSelf: 'center' }}>
                  Şablon adı boşken çağrı gönderilmiyor.
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 10, color: 'var(--ink-45)', marginTop: 6, lineHeight: 1.5 }}>
            {t.note ?? `Değişkenler: ${t.vars} · Boş bırakırsanız sistemin hazır metni gönderilir.`}
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
