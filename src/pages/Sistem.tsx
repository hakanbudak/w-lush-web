import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../components/icons';
import { Avatar, Chip } from '../components/ui';
import {
  createService,
  deleteService,
  listServices,
  updateService,
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

// Hizmetler artık API'den geliyor (bkz. HizmetSection). Statik liste kaldırıldı.

const PACKAGES = [
  { name: 'Cilt Bakımı 10’lu', sessions: '10 seans', price: '₺ 26.000', save: '%19 avantaj' },
  { name: 'Lazer Epilasyon 10’lu', sessions: '10 seans', price: '₺ 19.000', save: '%22 avantaj' },
  { name: 'Mezoterapi 6’lı', sessions: '6 seans', price: '₺ 21.000', save: '%15 avantaj' },
];

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

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          Paketler
          <span style={{ fontSize: 11, color: 'var(--ink-40)', fontWeight: 400, marginLeft: 8 }}>
            · statik (sonraki adımda API)
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {PACKAGES.map((p) => (
            <div key={p.name} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>{p.sessions}</div>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 12 }}>{p.price}</div>
              <Chip tone="sage" small style={{ marginTop: 8 }}>{p.save}</Chip>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sistem() {
  const [sec, setSec] = useState<Section>('klinik');
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
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Çalışma saatleri</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['Pazartesi – Cuma', '09:00 – 20:00'], ['Cumartesi', '09:00 – 19:30'], ['Pazar', 'Kapalı']].map(([d, h]) => (
                    <div key={d} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 12px', background: 'var(--cream)', borderRadius: 8 }}>
                      <span>{d}</span>
                      <span className="wl-mono" style={{ color: h === 'Kapalı' ? 'var(--ink-40)' : 'var(--ink)' }}>{h}</span>
                    </div>
                  ))}
                </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 10, background: 'var(--cream)', border: '1px solid var(--line)' }}>
                <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp Business · +90 212 555 04 12</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="wl-dot" style={{ background: 'var(--wa-green)' }} />
                    {flags.waConnected ? 'Bağlı · 12 yeni mesaj' : 'Bağlantı kesildi'}
                  </div>
                </div>
                <Toggle on={flags.waConnected} onClick={() => tog('waConnected')} />
              </div>
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
