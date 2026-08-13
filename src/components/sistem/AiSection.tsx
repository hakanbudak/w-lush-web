import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api/clinic';
import { useToast } from '../shell/Toast';

interface Flag {
  key: string;
  title: string;
  desc: string;
  /** Arkasında çalışan bir davranış var mı. */
  live: boolean;
}

const FLAGS: Flag[] = [
  {
    key: 'ai_auto_reminder',
    title: 'Otomatik randevu hatırlatma',
    desc: 'Randevudan önce WhatsApp hatırlatması gönderilsin.',
    live: true,
  },
  {
    key: 'ai_draft_replies',
    title: 'Yanıt taslağı öner',
    desc: 'Gelen mesajlara asistan bir yanıt taslağı hazırlasın.',
    live: false,
  },
  {
    key: 'ai_lapsed_alert',
    title: 'Kayıp danışan uyarısı',
    desc: 'Uzun süredir gelmeyen danışanlar için bildirim üretilsin. Danışana mesaj gitmez.',
    live: true,
  },
  {
    key: 'ai_upsell',
    title: 'Kampanya önerisi',
    desc: 'Gelir düştüğünde kampanya önerileri üretilsin.',
    live: false,
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

export default function AiSection() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  // Kaç gün sonra "kayıp" sayılsın. Klinikler arasında çok değişiyor:
  // diş kontrolü altı ay, lazer seansı bir ay.
  const [lapsedDays, setLapsedDays] = useState(120);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    getSettings()
      .then((s) => {
        const f: Record<string, boolean> = {};
        for (const flag of FLAGS) f[flag.key] = Boolean(s[flag.key]);
        setFlags(f);
        setLapsedDays(Number(s.lapsed_after_days) || 120);
        setLoaded(true);
      })
      .catch(() => setError('Ayarlar yüklenemedi.'));
  }, []);

  const save = () => {
    setSaving(true);
    setError(null);
    // Alan boşaltılırsa 0 gelir; 0 gün herkesi kayıp yapardı, o yüzden taban 7.
    const days = Math.max(7, lapsedDays || 120);
    setLapsedDays(days);
    updateSettings({ ...flags, lapsed_after_days: days })
      .then(() => toast('AI ayarları kaydedildi.'))
      .catch(() => setError('Kaydedilemedi.'))
      .finally(() => setSaving(false));
  };

  if (!loaded) {
    return <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>;
  }

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          background: 'var(--ai-band)',
          borderRadius: 'var(--r-card)',
          padding: '14px 16px',
          display: 'flex',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span style={{ color: 'var(--ai)', flexShrink: 0 }}>✦</span>
        <div style={{ fontSize: 12, color: 'var(--ai-dark)', lineHeight: 1.5 }}>
          Tercihleriniz kaydedilir. "Yakında" işaretli olanlar için asistan davranışı
          henüz devrede değil — ayarınız, özellik geldiğinde uygulanacak.
        </div>
      </div>

      {FLAGS.map((f) => (
        <div
          key={f.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 0',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', gap: 8 }}>
              {f.title}
              {!f.live && (
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
                  Yakında
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-60)', marginTop: 3 }}>{f.desc}</div>
            {/* Eşik yalnızca anahtar açıkken sorulur: kapalıyken anlamı yok. */}
            {f.key === 'ai_lapsed_alert' && flags[f.key] && (
              <label
                style={{
                  fontSize: 11,
                  color: 'var(--ink-60)',
                  display: 'block',
                  marginTop: 8,
                }}
              >
                Son ziyaretten kaç gün sonra
                <input
                  type="number"
                  min={7}
                  value={lapsedDays}
                  onChange={(e) => setLapsedDays(Number(e.target.value))}
                  style={{
                    width: 90,
                    marginLeft: 8,
                    border: '1px solid var(--line-strong)',
                    borderRadius: 8,
                    padding: '6px 8px',
                    font: 'inherit',
                    fontSize: 13,
                    background: 'var(--cream)',
                  }}
                />
              </label>
            )}
          </div>
          <Toggle
            on={flags[f.key] ?? false}
            onClick={() => setFlags((x) => ({ ...x, [f.key]: !x[f.key] }))}
          />
        </div>
      ))}

      {error && <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Kaydediliyor…' : 'AI ayarlarını kaydet'}
        </button>
      </div>
    </div>
  );
}
