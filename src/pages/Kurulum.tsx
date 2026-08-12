import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applySetup, listPresets, type Preset } from '../api/clinic';
import { useAuth } from '../auth/AuthContext';
import './auth.css';

const DAYS: [number, string][] = [
  [1, 'Pazartesi'],
  [2, 'Salı'],
  [3, 'Çarşamba'],
  [4, 'Perşembe'],
  [5, 'Cuma'],
  [6, 'Cumartesi'],
  [7, 'Pazar'],
];

const INTERVALS = [15, 30, 45, 60];

/** Saat listesi aralıktan üretilir; klinik sonradan Sistem'den düzenleyebilir. */
function slotsBetween(startHour: number, endHour: number, minutes: number): string[] {
  const out: string[] = [];
  for (let m = startHour * 60; m < endHour * 60; m += minutes) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 600,
              background:
                n < step ? 'var(--forest)' : n === step ? 'var(--navy)' : 'var(--cream-3)',
              color: n <= step ? 'var(--paper)' : 'var(--ink-45)',
            }}
          >
            {n < step ? '✓' : n}
          </span>
          {n < 3 && (
            <span
              style={{
                width: 34,
                height: 2,
                background: n < step ? 'var(--forest)' : 'var(--cream-3)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Kayıttan sonraki üç adımlı kurulum. Sonunda demo hizmetler kliniğin kendi
 * seçimiyle değiştirilir ve panele hoş geldiniz turuyla girilir.
 */
export default function Kurulum() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [step, setStep] = useState(1);
  const [type, setType] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [openDays, setOpenDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [interval, setInterval] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPresets()
      .then(setPresets)
      .catch(() => setError('Klinik tipleri yüklenemedi.'));
  }, []);

  const preset = presets.find((p) => p.key === type) ?? null;

  const pickType = (key: string) => {
    setType(key);
    // Tipin tamamı seçili başlar: çoğu klinik listeyi kısaltır, uzatmaz.
    const p = presets.find((x) => x.key === key);
    setChosen(new Set(p ? p.services.map((s) => s.name) : []));
  };

  const finish = () => {
    if (!type) return;
    setBusy(true);
    setError(null);
    applySetup({
      clinic_type: type,
      services: [...chosen],
      open_days: openDays,
      slot_times: slotsBetween(9, 19, interval),
      slot_interval_minutes: interval,
    })
      .then(() => navigate('/?tour=1', { replace: true }))
      .catch(() => {
        setError('Kurulum kaydedilemedi.');
        setBusy(false);
      });
  };

  return (
    <div className="wl wl-auth-split">
      <aside className="wl-auth-side">
        <div className="wl-auth-brand">
          <span className="wl-auth-logo">w</span>
          <span>w-lush</span>
        </div>
        <div className="wl-auth-chip">KLİNİK YÖNETİM PLATFORMU</div>
        <h1 className="wl-auth-hero">
          {user?.clinic.name ?? 'Kliniğiniz'} için
          <br />
          birkaç dakikalık kurulum.
        </h1>
        <p className="wl-auth-lead">
          Seçtikleriniz sonradan Sistem ekranından değiştirilebilir — burada verdiğiniz
          hiçbir karar kalıcı değil.
        </p>
      </aside>

      <main className="wl-auth-main">
        <div style={{ width: '100%', maxWidth: 460 }}>
          <StepDots step={step} />

          {step === 1 && (
            <>
              <h2 className="wl-auth-title">Klinik tipiniz</h2>
              <p className="wl-auth-sub">Hazır hizmet listesi buna göre gelir.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {presets.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => pickType(p.key)}
                    style={{
                      textAlign: 'left',
                      font: 'inherit',
                      cursor: 'pointer',
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: type === p.key ? 'var(--forest-3)' : 'var(--paper)',
                      border:
                        type === p.key
                          ? '1px solid var(--forest)'
                          : '1px solid var(--line-strong)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 2 }}>
                      {p.services.length} hazır hizmet
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && preset && (
            <>
              <h2 className="wl-auth-title">Hizmetleriniz</h2>
              <p className="wl-auth-sub">
                Sunmadıklarınızı çıkarın. Fiyatları sonra Sistem'den girersiniz.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {preset.services.map((s) => {
                  const on = chosen.has(s.name);
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() =>
                        setChosen((c) => {
                          const next = new Set(c);
                          if (next.has(s.name)) next.delete(s.name);
                          else next.add(s.name);
                          return next;
                        })
                      }
                      style={{
                        font: 'inherit',
                        fontSize: 12.5,
                        cursor: 'pointer',
                        padding: '7px 12px',
                        borderRadius: 999,
                        background: on ? 'var(--forest-3)' : 'var(--paper)',
                        color: on ? 'var(--forest-2)' : 'var(--ink-60)',
                        border: on ? '1px solid var(--forest)' : '1px solid var(--line-strong)',
                      }}
                    >
                      {on ? '✓ ' : ''}
                      {s.name}
                      <span style={{ opacity: 0.6 }}> · {s.duration_minutes} dk</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="wl-auth-title">Çalışma düzeni</h2>
              <p className="wl-auth-sub">Açık günler ve randevu aralığı.</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {DAYS.map(([n, label]) => {
                  const on = openDays.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setOpenDays((d) =>
                          d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort(),
                        )
                      }
                      style={{
                        font: 'inherit',
                        fontSize: 12.5,
                        cursor: 'pointer',
                        padding: '7px 12px',
                        borderRadius: 999,
                        background: on ? 'var(--forest-3)' : 'var(--paper)',
                        color: on ? 'var(--forest-2)' : 'var(--ink-45)',
                        border: on ? '1px solid var(--forest)' : '1px solid var(--line-strong)',
                      }}
                    >
                      {on ? label : `${label} · kapalı`}
                    </button>
                  );
                })}
              </div>

              <div className="wl-label" style={{ marginBottom: 8 }}>
                Randevu aralığı
              </div>
              <div style={{ display: 'inline-flex', background: 'var(--cream)', borderRadius: 9, padding: 3 }}>
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
              <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 8, lineHeight: 1.5 }}>
                09:00–19:00 arası {slotsBetween(9, 19, interval).length} randevu saati
                oluşturulur.
              </div>
            </>
          )}

          {error && (
            <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 14 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 26 }}>
            {step > 1 && (
              <button
                type="button"
                className="wl-btn wl-btn-ghost wl-btn-sm"
                style={{ height: 40, borderRadius: 9 }}
                onClick={() => setStep(step - 1)}
              >
                Geri
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < 3 ? (
              <button
                type="button"
                className="wl-btn wl-btn-sm"
                style={{ height: 40, borderRadius: 9, fontWeight: 600, padding: '0 20px' }}
                disabled={step === 1 && !type}
                onClick={() => setStep(step + 1)}
              >
                Devam et
              </button>
            ) : (
              <button
                type="button"
                className="wl-btn wl-btn-sm"
                style={{ height: 40, borderRadius: 9, fontWeight: 600, padding: '0 20px' }}
                disabled={busy || openDays.length === 0}
                onClick={finish}
              >
                {busy ? 'Kaydediliyor…' : 'Kurulumu bitir'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              marginTop: 18,
              font: 'inherit',
              fontSize: 12,
              color: 'var(--ink-45)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Şimdilik atla — demo hizmetlerle devam et
          </button>
        </div>
      </main>
    </div>
  );
}
