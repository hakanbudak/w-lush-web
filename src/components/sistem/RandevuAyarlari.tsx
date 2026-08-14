import { useEffect, useState } from 'react';
import {
  getSettings,
  updateSettings,
  type ClinicSettings,
} from '../../api/clinic';
import { Icon } from '../icons';
import Select from '../ui/Select';

const GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']; // iso = index + 1

export default function RandevuAyarlari() {
  const [s, setS] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    getSettings()
      .then(setS)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div style={{ fontSize: 13, color: 'var(--ink-40)' }}>Yükleniyor…</div>;
  if (!s)
    return (
      <div style={{ fontSize: 12, color: 'var(--bad)' }}>
        {error} — API çalışıyor mu? (uvicorn :8000)
      </div>
    );

  const openDays: number[] = Array.isArray(s.open_days) ? s.open_days : [];
  const slots: string[] = Array.isArray(s.slot_times) ? s.slot_times : [];
  const set = (p: Partial<ClinicSettings>) =>
    setS((cur) => ({ ...(cur as ClinicSettings), ...p }));

  const toggleDay = (iso: number) =>
    set({
      open_days: openDays.includes(iso)
        ? openDays.filter((d) => d !== iso)
        : [...openDays, iso].sort(),
    });

  const addTime = () => {
    if (!/^\d{2}:\d{2}$/.test(newTime) || slots.includes(newTime)) return;
    set({ slot_times: [...slots, newTime].sort() });
    setNewTime('');
  };
  const removeTime = (t: string) =>
    set({ slot_times: slots.filter((x) => x !== t) });

  async function save() {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const cur = s as ClinicSettings;
      const updated = await updateSettings({
        open_days: cur.open_days,
        slot_times: cur.slot_times,
        days_ahead: Number(cur.days_ahead) || 1,
        handoff_mode: cur.handoff_mode,
        handoff_target: cur.handoff_target,
      });
      setS(updated);
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Randevu ayarları · WhatsApp botu kullanır
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ok && <span style={{ fontSize: 12, color: 'var(--sage-2)' }}>Kaydedildi ✓</span>}
          <button
            className="wl-btn wl-btn-sm"
            disabled={saving}
            style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}
            onClick={save}
          >
            {saving ? '…' : <>{Icon.check}Kaydet</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--bad)', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px' }}>
          {error}
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Açık günler</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {GUN.map((g, idx) => {
            const iso = idx + 1;
            const on = openDays.includes(iso);
            return (
              <button
                key={g}
                onClick={() => toggleDay(iso)}
                style={{
                  width: 44, height: 34, borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--line)',
                  background: on ? 'var(--forest)' : 'var(--paper)',
                  color: on ? 'var(--cream)' : 'var(--ink-40)',
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Randevu saatleri</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {slots.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--ink-40)' }}>Saat yok</span>
          )}
          {slots.map((t) => (
            <span key={t} className="wl-chip wl-chip-cream" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="wl-mono">{t}</span>
              <button
                onClick={() => removeTime(t)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-40)', fontSize: 13, lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="wl-input"
            type="time"
            value={newTime}
            style={{ width: 140 }}
            onChange={(e) => setNewTime(e.target.value)}
          />
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={addTime}>
            {Icon.plus}Saat ekle
          </button>
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 220 }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>Kaç gün ileri randevu</span>
        <input
          className="wl-input wl-mono"
          type="number"
          min={1}
          max={30}
          value={Number(s.days_ahead) || 7}
          onChange={(e) => set({ days_ahead: Number(e.target.value) })}
        />
      </label>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
          "Diğer" talepleri — ekibe iletim
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select
            value={String(s.handoff_mode || 'log')}
            onChange={(v) => set({ handoff_mode: v })}
            ariaLabel="Talep iletim yolu"
            options={[
              { value: 'log', label: 'Sadece kaydet (panelde gör)' },
              { value: 'whatsapp', label: 'WhatsApp ile ilet' },
              { value: 'email', label: 'E-posta ile ilet' },
            ]}
            style={{ width: 230 }}
            className="wl-input"
          />
          <input
            className="wl-input"
            placeholder="Numara veya e-posta"
            value={String(s.handoff_target || '')}
            style={{ flex: 1, minWidth: 220 }}
            onChange={(e) => set({ handoff_target: e.target.value })}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 6 }}>
          Not: Meta test modunda WhatsApp iletimi yalnız izinli numaralara çalışır.
          Demo için "Sadece kaydet" önerilir.
        </div>
      </div>
    </div>
  );
}
