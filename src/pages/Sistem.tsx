import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../components/icons';
import { Avatar, Chip } from '../components/ui';
import WhatsAppConnect from '../components/WhatsAppConnect';
import {
  createPackage,
  createService,
  deletePackage,
  deleteService,
  getSettings,
  listPackages,
  listServices,
  updatePackage,
  updateService,
  updateSettings,
  type ClinicSettings,
  type Package,
  type Service,
} from '../api/clinic';

/* ───────── yardımcılar ───────── */
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 40,
        height: 24,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: on ? 'var(--forest)' : 'var(--cream-3)',
        position: 'relative',
        transition: 'background .15s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 19 : 3,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: 'var(--paper)',
          transition: 'left .15s',
          boxShadow: '0 1px 3px rgba(42,53,48,0.25)',
        }}
      />
    </button>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <input className="wl-input" defaultValue={value} />
      {sub && <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>{sub}</span>}
    </label>
  );
}

function SettingRow({ title, desc, control }: { title: string; desc: string; control: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 2 }}>{desc}</div>
      </div>
      {control}
    </div>
  );
}

/* ───────── bölümler ───────── */
type Section = 'klinik' | 'personel' | 'hizmet' | 'whatsapp' | 'ai';
const SECTIONS: { key: Section; label: string; icon: keyof typeof Icon; sub: string }[] = [
  { key: 'klinik', label: 'Klinik bilgisi', icon: 'home', sub: 'Şube, adres, çalışma saatleri' },
  { key: 'personel', label: 'Personel', icon: 'users', sub: 'Uzmanlar ve roller' },
  { key: 'hizmet', label: 'Hizmetler & paketler', icon: 'sparkle', sub: 'Fiyatlandırma' },
  { key: 'whatsapp', label: 'WhatsApp şablonları', icon: 'whatsapp', sub: 'Otomatik mesajlar' },
  { key: 'ai', label: 'AI kalibrasyon', icon: 'chart', sub: 'Eşikler ve davranış' },
];

const STAFF = [
  { name: 'Dr. Defne A.', role: 'Estetik doktoru', exp: 'Botoks · Dolgu · Konsültasyon', active: true },
  { name: 'Ebru B.', role: 'Cilt uzmanı', exp: 'Hydrafacial · Cilt bakımı · Mezoterapi', active: true },
  { name: 'Selin K.', role: 'Lazer teknikeri', exp: 'Lazer epilasyon', active: true },
  { name: 'Nil A.', role: 'Cilt uzmanı', exp: 'Cilt bakımı', active: false },
];

// Hizmetler & paketler artık API'den geliyor (bkz. HizmetSection / PaketSection).

const TEMPLATES = [
  { name: 'Randevu hatırlatma', when: '24 saat önce · otomatik', text: 'Merhaba {ad} 🌿 {tarih} {saat} {uzman} ile randevunuzu hatırlatırız. Onaylamak için 1, ertelemek için 2 yazabilirsiniz.' },
  { name: 'Randevu onayı', when: 'Randevu oluşunca', text: 'Randevunuz oluşturuldu ✅ {tarih} {saat} · {hizmet} · {uzman}. Görüşmek üzere!' },
  { name: 'Kampanya / yeniden kazanım', when: 'AI önerisiyle', text: '{ad}, sizi özledik 💚 {hizmet} için size özel %{indirim} indirim tanımladık. Detay için yazmanız yeterli.' },
];

/* ───────── Hizmetler & paketler — canlı API (/api/services) ───────── */
type Row = Service & { _new?: boolean };

function HizmetSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listServices()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const patch = (i: number, p: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      { id: -Date.now(), name: '', price: 0, active: true, sort_order: r.length, _new: true },
    ]);

  async function save(i: number) {
    const row = rows[i];
    if (!row.name.trim()) {
      setError('Hizmet adı boş olamaz');
      return;
    }
    setBusy(row.id);
    setError(null);
    const body = {
      name: row.name.trim(),
      price: Number(row.price) || 0,
      active: row.active,
      sort_order: row.sort_order,
    };
    try {
      const saved = row._new
        ? await createService(body)
        : await updateService(row.id, body);
      setRows((r) => r.map((x, idx) => (idx === i ? saved : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(i: number) {
    const row = rows[i];
    if (row._new) {
      setRows((r) => r.filter((_, idx) => idx !== i));
      return;
    }
    if (!window.confirm(`"${row.name}" silinsin mi?`)) return;
    setBusy(row.id);
    try {
      await deleteService(row.id);
      setRows((r) => r.filter((_, idx) => idx !== i));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            Hizmetler & fiyatlar
            <span style={{ fontSize: 11, color: 'var(--ink-40)', fontWeight: 400, marginLeft: 8 }}>
              · WhatsApp botu bu listeyi kullanır
            </span>
          </div>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={addRow}>
            {Icon.plus}Hizmet ekle
          </button>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: 'var(--bad)', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
            {error} — API çalışıyor mu? (uvicorn :8000)
          </div>
        )}

        {loading ? (
          <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '20px 0' }}>Yükleniyor…</div>
        ) : (
          <table className="wl-table" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
            <thead>
              <tr>
                <th>Hizmet</th>
                <th style={{ width: 150, textAlign: 'right' }}>Fiyat (₺)</th>
                <th style={{ width: 80 }}>Durum</th>
                <th style={{ width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--ink-40)', fontSize: 13 }}>
                    Henüz hizmet yok — "Hizmet ekle" ile başlayın.
                  </td>
                </tr>
              )}
              {rows.map((s, i) => (
                <tr key={s.id}>
                  <td>
                    <input
                      className="wl-input"
                      value={s.name}
                      placeholder="Hizmet adı"
                      onChange={(e) => patch(i, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="wl-input wl-mono"
                      type="number"
                      min={0}
                      value={s.price}
                      style={{ textAlign: 'right' }}
                      onChange={(e) => patch(i, { price: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <Toggle on={s.active} onClick={() => patch(i, { active: !s.active })} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="wl-btn wl-btn-sm"
                        disabled={busy === s.id}
                        style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}
                        onClick={() => save(i)}
                      >
                        {busy === s.id ? '…' : <>{Icon.check}Kaydet</>}
                      </button>
                      <button
                        className="wl-btn wl-btn-ghost wl-btn-sm"
                        style={{ borderRadius: 8 }}
                        onClick={() => remove(i)}
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PaketSection />
    </div>
  );
}

/* ───────── Paketler — canlı API (/api/packages) ───────── */
type PkgRow = Package & { _new?: boolean };

function PaketSection() {
  const [rows, setRows] = useState<PkgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listPackages()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const patch = (i: number, p: Partial<PkgRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        id: -Date.now(), name: '', sessions: 1, price: 0,
        save_percent: 0, active: true, sort_order: r.length, _new: true,
      },
    ]);

  async function save(i: number) {
    const row = rows[i];
    if (!row.name.trim()) {
      setError('Paket adı boş olamaz');
      return;
    }
    setBusy(row.id);
    setError(null);
    const body = {
      name: row.name.trim(),
      sessions: Number(row.sessions) || 1,
      price: Number(row.price) || 0,
      save_percent: Number(row.save_percent) || 0,
      active: row.active,
      sort_order: row.sort_order,
    };
    try {
      const saved = row._new
        ? await createPackage(body)
        : await updatePackage(row.id, body);
      setRows((r) => r.map((x, idx) => (idx === i ? saved : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(i: number) {
    const row = rows[i];
    if (row._new) {
      setRows((r) => r.filter((_, idx) => idx !== i));
      return;
    }
    if (!window.confirm(`"${row.name}" silinsin mi?`)) return;
    setBusy(row.id);
    try {
      await deletePackage(row.id);
      setRows((r) => r.filter((_, idx) => idx !== i));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Paketler
          <span style={{ fontSize: 11, color: 'var(--ink-40)', fontWeight: 400, marginLeft: 8 }}>
            · çok seanslı kampanya fiyatları
          </span>
        </div>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={addRow}>
          {Icon.plus}Paket ekle
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--bad)', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
          {error} — API çalışıyor mu? (uvicorn :8000)
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '20px 0' }}>Yükleniyor…</div>
      ) : (
        <table className="wl-table" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
          <thead>
            <tr>
              <th>Paket</th>
              <th style={{ width: 90, textAlign: 'right' }}>Seans</th>
              <th style={{ width: 140, textAlign: 'right' }}>Fiyat (₺)</th>
              <th style={{ width: 110, textAlign: 'right' }}>%Avantaj</th>
              <th style={{ width: 80 }}>Durum</th>
              <th style={{ width: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--ink-40)', fontSize: 13 }}>
                  Henüz paket yok — "Paket ekle" ile başlayın.
                </td>
              </tr>
            )}
            {rows.map((p, i) => (
              <tr key={p.id}>
                <td>
                  <input
                    className="wl-input"
                    value={p.name}
                    placeholder="Paket adı"
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="wl-input wl-mono"
                    type="number"
                    min={1}
                    value={p.sessions}
                    style={{ textAlign: 'right' }}
                    onChange={(e) => patch(i, { sessions: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="wl-input wl-mono"
                    type="number"
                    min={0}
                    value={p.price}
                    style={{ textAlign: 'right' }}
                    onChange={(e) => patch(i, { price: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="wl-input wl-mono"
                    type="number"
                    min={0}
                    max={100}
                    value={p.save_percent}
                    style={{ textAlign: 'right' }}
                    onChange={(e) => patch(i, { save_percent: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <Toggle on={p.active} onClick={() => patch(i, { active: !p.active })} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="wl-btn wl-btn-sm"
                      disabled={busy === p.id}
                      style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}
                      onClick={() => save(i)}
                    >
                      {busy === p.id ? '…' : <>{Icon.check}Kaydet</>}
                    </button>
                    <button
                      className="wl-btn wl-btn-ghost wl-btn-sm"
                      style={{ borderRadius: 8 }}
                      onClick={() => remove(i)}
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ───────── Klinik bilgisi → Randevu ayarları (canlı /api/settings) ───────── */
const GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']; // iso = index + 1

function RandevuAyarlari() {
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
          <select
            className="wl-input"
            value={String(s.handoff_mode || 'log')}
            style={{ width: 230 }}
            onChange={(e) => set({ handoff_mode: e.target.value })}
          >
            <option value="log">Sadece kaydet (panelde gör)</option>
            <option value="whatsapp">WhatsApp ile ilet</option>
            <option value="email">E-posta ile ilet</option>
          </select>
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

export default function Sistem() {
  // Derin bağlantı: /sistem?sec=whatsapp → ilgili bölümü doğrudan aç.
  const initialSec = new URLSearchParams(window.location.search).get('sec');
  const [sec, setSec] = useState<Section>(
    SECTIONS.some((s) => s.key === initialSec) ? (initialSec as Section) : 'klinik',
  );
  const [flags, setFlags] = useState({
    autoDraft: true,
    autoReminder: true,
    riskAlert: true,
    aggressive: false,
    waConnected: true,
  });
  const tog = (k: keyof typeof flags) => setFlags((f) => ({ ...f, [k]: !f[k] }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr', gap: 14, flex: 1, minHeight: 0 }}>
      {/* sol bölüm navı */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 2, height: 'fit-content' }}>
        {SECTIONS.map((s) => {
          const active = sec === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSec(s.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                background: active ? 'var(--cream-2)' : 'transparent',
              }}
            >
              <span style={{ color: active ? 'var(--forest)' : 'var(--ink-40)', display: 'flex' }}>{Icon[s.icon]}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: active ? 600 : 500, color: 'var(--ink)' }}>{s.label}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-40)', marginTop: 1 }}>{s.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* içerik */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{SECTIONS.find((s) => s.key === sec)?.label}</div>
          <button className="wl-btn wl-btn-sm" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}>{Icon.check}Kaydet</button>
        </div>

        <div style={{ padding: 24, overflow: 'auto', flex: 1 }}>
          {sec === 'klinik' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 720 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--forest)', display: 'grid', placeItems: 'center', color: 'var(--cream)', fontWeight: 600, fontSize: 22 }}>w</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>w-lush · Maslak şubesi</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 2 }}>Logo PNG/SVG · maks. 1MB</div>
                </div>
                <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, marginLeft: 'auto' }}>{Icon.edit}Logo değiştir</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Klinik adı" value="w-lush Güzellik & Estetik" />
                <Field label="Şube" value="Maslak" />
                <Field label="Telefon" value="+90 212 555 04 12" />
                <Field label="E-posta" value="maslak@w-lush.com" />
                <Field label="Adres" value="Maslak Mah. Büyükdere Cd. No:128, Sarıyer / İstanbul" sub="Haritada görünür" />
                <Field label="Vergi no" value="123 456 7890" />
              </div>
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
                <RandevuAyarlari />
              </div>
            </div>
          )}

          {sec === 'personel' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }}>{Icon.plus}Personel ekle</button>
              </div>
              <table className="wl-table" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
                <thead>
                  <tr><th>Personel</th><th>Rol</th><th>Uzmanlık</th><th>Durum</th><th style={{ width: 40 }}></th></tr>
                </thead>
                <tbody>
                  {STAFF.map((p, i) => (
                    <tr key={p.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={p.name} i={i} size={28} />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--ink-60)' }}>{p.role}</td>
                      <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>{p.exp}</td>
                      <td>{p.active ? <Chip tone="good" small>{Icon.check}Aktif</Chip> : <Chip tone="cream" small>Pasif</Chip>}</td>
                      <td><span style={{ color: 'var(--ink-40)', cursor: 'pointer' }}>{Icon.more}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sec === 'hizmet' && <HizmetSection />}

          {sec === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
              {/* Canlı bağlantı durumu (Model A) */}
              <WhatsAppConnect />
              {TEMPLATES.map((t) => (
                <div key={t.name} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                    <Chip tone="cream" small>{t.when}</Chip>
                    <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ marginLeft: 'auto', borderRadius: 8 }}>{Icon.edit}Düzenle</button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-60)', background: '#DCF8C6', borderRadius: 10, borderBottomLeftRadius: 4, padding: '12px 14px', lineHeight: 1.5 }}>
                    {t.text}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 8 }}>Değişkenler: {'{ad} {tarih} {saat} {uzman} {hizmet} {indirim}'}</div>
                </div>
              ))}
            </div>
          )}

          {sec === 'ai' && (
            <div style={{ maxWidth: 720 }}>
              <div style={{ background: 'var(--lavender-soft)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, marginBottom: 18 }}>
                <span style={{ color: 'var(--lavender-2)', display: 'flex', flexShrink: 0 }}>{Icon.sparkle}</span>
                <div style={{ fontSize: 12, color: 'var(--lavender-2)', lineHeight: 1.5 }}>
                  AI asistan; randevu, gelir ve mesaj verilerini kullanarak öneri üretir. Eşikleri buradan ayarlayabilirsiniz — değişiklikler bir sonraki taramada geçerli olur.
                </div>
              </div>
              <SettingRow title="Otomatik WA taslağı" desc="Gelen mesajlara ✦ AI yanıt taslağı önerilsin" control={<Toggle on={flags.autoDraft} onClick={() => tog('autoDraft')} />} />
              <SettingRow title="Otomatik randevu hatırlatma" desc="24 saat önce WhatsApp hatırlatması gönderilsin" control={<Toggle on={flags.autoReminder} onClick={() => tog('autoReminder')} />} />
              <SettingRow title="İptal riski uyarısı" desc="Risk skoru %60 üzerindeyse takvimde işaretle" control={<Toggle on={flags.riskAlert} onClick={() => tog('riskAlert')} />} />
              <SettingRow title="Agresif kampanya önerisi" desc="Düşük eğilimlerde daha sık kampanya öner" control={<Toggle on={flags.aggressive} onClick={() => tog('aggressive')} />} />
              <div style={{ paddingTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 500 }}>İptal riski eşiği</span>
                  <span className="wl-mono" style={{ color: 'var(--lavender-2)' }}>%62</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--cream-2)', overflow: 'hidden' }}>
                  <div style={{ width: '62%', height: '100%', background: 'var(--lavender)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 6 }}>Bu eşiğin üzerindeki danışanlar için ön ödeme akışı önerilir.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
