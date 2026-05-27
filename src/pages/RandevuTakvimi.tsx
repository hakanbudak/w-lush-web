import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/icons';
import { Avatar, Chip } from '../components/ui';
import {
  cancelAppointment,
  confirmAppointment,
  listAppointments,
  listRequests,
  type Appointment,
  type ClinicRequest,
} from '../api/clinic';

/* ───────── veri modeli ───────── */
type Channel = 'wa' | 'web' | 'man';
type Cat = 'hydra' | 'lazer' | 'enjekte' | 'mezo' | 'konsult';

interface Appt {
  id: string;
  staff: 'defne' | 'ebru' | 'selin';
  day: number; // 0 Pzt … 5 Cmt … 6 Paz
  start: string; // "HH:MM"
  end: string;
  client: string;
  service: string;
  cat: Cat;
  channel: Channel;
  status: 'onayli' | 'devam' | 'tamam' | 'risk';
  price: string;
  tags?: string[];
  note?: string;
  risk?: string;
}

const STAFF = [
  { key: 'defne', name: 'Dr. Defne A.', role: 'Estetik doktoru' },
  { key: 'ebru', name: 'Ebru B.', role: 'Cilt uzmanı' },
  { key: 'selin', name: 'Selin K.', role: 'Lazer teknikeri' },
] as const;

const WEEK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const CAT: Record<Cat, { label: string; bg: string; bar: string; text: string }> = {
  hydra: { label: 'Cilt bakımı', bg: 'var(--forest-3)', bar: 'var(--forest)', text: 'var(--forest-2)' },
  lazer: { label: 'Lazer', bg: 'var(--champagne-3)', bar: 'var(--champagne)', text: 'var(--champagne-2)' },
  enjekte: { label: 'Botoks / Dolgu', bg: 'var(--lavender-soft)', bar: 'var(--lavender)', text: 'var(--lavender-2)' },
  mezo: { label: 'Mezoterapi', bg: 'var(--sage-soft)', bar: 'var(--sage)', text: 'var(--sage-2)' },
  konsult: { label: 'Konsültasyon', bg: 'var(--cream-2)', bar: 'var(--ink-40)', text: 'var(--ink-60)' },
};

const OPEN = 540; // 09:00
const CLOSE = 1200; // 20:00
const PX_PER_MIN = 1.7; // 30 dk ≈ 51px — bloklar içerik için rahat
const TOP_PAD = 14; // ilk/son saat etiketinin kırpılmaması için
const COL_H = (CLOSE - OPEN) * PX_PER_MIN;
const GRID_H = COL_H + TOP_PAD * 2;

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const APPTS: Appt[] = [
  { id: 'a1', staff: 'ebru', day: 5, start: '09:00', end: '10:00', client: 'Duygu Özsever', service: 'Hydrafacial · Premium', cat: 'hydra', channel: 'wa', status: 'tamam', price: '₺ 3.200', tags: ['Sadık'], note: 'Cilt nemlendirme paketinin 4. seansı.' },
  { id: 'a2', staff: 'selin', day: 5, start: '10:15', end: '11:15', client: 'Selin Akın', service: 'Lazer Epilasyon · Tüm vücut', cat: 'lazer', channel: 'wa', status: 'devam', price: '₺ 2.450', tags: ['8/10 seans'] },
  { id: 'a3', staff: 'defne', day: 5, start: '11:30', end: '12:15', client: 'Cem Yıldırım', service: 'Konsültasyon · Botoks', cat: 'konsult', channel: 'man', status: 'onayli', price: 'Ücretsiz', note: 'İlk görüşme — alın ve kaz ayağı bölgesi.' },
  { id: 'a4', staff: 'ebru', day: 5, start: '13:00', end: '14:00', client: 'Aslı Demir', service: 'Mezoterapi + Cilt analizi', cat: 'mezo', channel: 'wa', status: 'onayli', price: '₺ 4.100', tags: ['VIP'] },
  { id: 'a5', staff: 'defne', day: 5, start: '15:45', end: '16:45', client: 'Pınar Kaya', service: 'Dolgu · Dudak revizyon', cat: 'enjekte', channel: 'wa', status: 'risk', price: '₺ 6.800', tags: ['Risk'], risk: 'İptal riski %62 — son 2 randevuyu erteledi. AI ön ödeme akışı öneriyor.', note: 'Revizyon talebi; hassas bölge.' },
  { id: 'a6', staff: 'selin', day: 5, start: '14:00', end: '14:45', client: 'Gözde Arı', service: 'Lazer · Yüz', cat: 'lazer', channel: 'web', status: 'onayli', price: '₺ 1.250' },
  { id: 'a7', staff: 'ebru', day: 5, start: '17:00', end: '18:00', client: 'Murat Aksoy', service: 'Cilt analizi · İlk seans', cat: 'hydra', channel: 'web', status: 'onayli', price: '₺ 900' },
  { id: 'a8', staff: 'defne', day: 5, start: '18:15', end: '19:00', client: 'Elif Şahin', service: 'Botoks · Alın', cat: 'enjekte', channel: 'wa', status: 'onayli', price: '₺ 5.400', tags: ['Sadık'] },
  // diğer günler (Hafta görünümü için)
  { id: 'b1', staff: 'ebru', day: 0, start: '10:00', end: '11:00', client: 'Ceren Öz', service: 'Hydrafacial', cat: 'hydra', channel: 'wa', status: 'onayli', price: '₺ 3.200' },
  { id: 'b2', staff: 'selin', day: 1, start: '13:00', end: '14:00', client: 'Berfin Çağlar', service: 'Lazer Epilasyon', cat: 'lazer', channel: 'wa', status: 'onayli', price: '₺ 2.450' },
  { id: 'b3', staff: 'defne', day: 2, start: '11:00', end: '12:00', client: 'Ezgi Uçar', service: 'Mezoterapi', cat: 'mezo', channel: 'web', status: 'onayli', price: '₺ 4.100' },
  { id: 'b4', staff: 'defne', day: 3, start: '15:00', end: '16:00', client: 'Naz Yılmaz', service: 'Dolgu · Yanak', cat: 'enjekte', channel: 'wa', status: 'onayli', price: '₺ 6.800' },
  { id: 'b5', staff: 'ebru', day: 4, start: '09:30', end: '10:30', client: 'Sıla Demirtaş', service: 'Cilt bakımı', cat: 'hydra', channel: 'man', status: 'onayli', price: '₺ 1.900' },
  { id: 'b6', staff: 'selin', day: 6, start: '12:00', end: '13:00', client: 'Tuğçe Er', service: 'Lazer · Bacak', cat: 'lazer', channel: 'wa', status: 'onayli', price: '₺ 1.800' },
];

// 14:30 boş slot — AI önerisi (Ebru B. günü)
const AI_SLOT = { staff: 'ebru' as const, start: '14:30', end: '15:30', client: 'Berfin Çağlar', fit: 92 };

const statusChip = (s: Appt['status']) => {
  if (s === 'tamam') return <Chip tone="good" small>{Icon.check}Tamamlandı</Chip>;
  if (s === 'devam') return <Chip tone="forest" small><span className="wl-dot" style={{ background: 'var(--cream)' }} />Devam ediyor</Chip>;
  if (s === 'risk') return <Chip tone="blush" small>İptal riski %62</Chip>;
  return <Chip tone="cream" small>Onaylı</Chip>;
};

const channelChip = (c: Channel) =>
  c === 'wa' ? (
    <Chip tone="wa" small>{Icon.whatsapp}WhatsApp</Chip>
  ) : c === 'web' ? (
    <Chip tone="champagne" small>Web</Chip>
  ) : (
    <Chip tone="cream" small>Manuel</Chip>
  );

/* ───────── WhatsApp randevuları (canlı /api/appointments) ───────── */
const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const GUNAD = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']; // JS getDay: 0=Paz

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNAD[d.getDay()]}`;
}

function maskPhone(p: string): string {
  return p.length < 6 ? p : `${p.slice(0, 4)}••••${p.slice(-2)}`;
}

function statusInfo(s: string): { tone: 'good' | 'blush' | 'cream'; label: string } {
  if (s === 'confirmed' || s === 'onayli') return { tone: 'good', label: 'Onaylı' };
  if (s === 'cancelled' || s === 'iptal') return { tone: 'blush', label: 'İptal' };
  return { tone: 'cream', label: 'Bekliyor' };
}

function WhatsAppRandevulari() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listAppointments()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function act(id: number, kind: 'confirm' | 'cancel') {
    setBusy(id);
    setError(null);
    try {
      const updated = await (kind === 'confirm'
        ? confirmAppointment(id)
        : cancelAppointment(id));
      setItems((cur) =>
        cur ? cur.map((a) => (a.id === id ? updated : a)) : cur,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
          <div style={{ fontSize: 14, fontWeight: 600 }}>WhatsApp Randevuları</div>
          <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>· bot üzerinden alınan gerçek kayıtlar</span>
        </div>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={load} disabled={loading}>
          {loading ? '…' : 'Yenile'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--bad)', padding: '12px 20px' }}>
          {error} — API çalışıyor mu? (uvicorn :8000)
        </div>
      )}
      {!error && loading && !items && (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '16px 20px' }}>Yükleniyor…</div>
      )}
      {!error && items && items.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '16px 20px' }}>
          Henüz WhatsApp'tan randevu yok. Bot üzerinden bir randevu alınınca burada görünür.
        </div>
      )}
      {items && items.length > 0 && (
        <div style={{ maxHeight: 5 * 52, overflowY: 'auto' }}>
          <table className="wl-table" style={{ width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 1 }}>
              <tr>
                <th>Tarih</th>
                <th>Saat</th>
                <th>Hizmet</th>
                <th>Müşteri</th>
                <th>Durum</th>
                <th style={{ width: 76 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const st = statusInfo(a.status);
                const isPending = a.status === 'pending' || a.status === 'bekliyor';
                const isBusy = busy === a.id;
                return (
                  <tr key={a.id}>
                    <td>{fmtDate(a.appt_date)}</td>
                    <td className="wl-mono">{a.appt_time}</td>
                    <td style={{ fontWeight: 500 }}>{a.service_name}</td>
                    <td className="wl-mono" style={{ color: 'var(--ink-60)' }}>
                      {a.customer_name || maskPhone(a.phone)}
                    </td>
                    <td>
                      <Chip tone={st.tone} small>
                        {st.label}
                      </Chip>
                    </td>
                    <td>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            title="Onayla — müşteriye WhatsApp mesajı gönderir"
                            disabled={isBusy}
                            onClick={() => act(a.id, 'confirm')}
                            style={{
                              width: 28, height: 28, padding: 0, borderRadius: 6, border: 'none', cursor: 'pointer',
                              background: 'var(--forest)', color: 'var(--cream)',
                              display: 'grid', placeItems: 'center',
                            }}
                          >
                            {isBusy ? '…' : Icon.check}
                          </button>
                          <button
                            title="İptal — müşteriye iptal mesajı gönderir"
                            disabled={isBusy}
                            onClick={() => act(a.id, 'cancel')}
                            style={{
                              width: 28, height: 28, padding: 0, borderRadius: 6, cursor: 'pointer',
                              background: 'transparent', color: 'var(--bad)',
                              border: '1px solid var(--line)',
                              display: 'grid', placeItems: 'center',
                            }}
                          >
                            {Icon.x}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-40)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ───────── WhatsApp "Diğer" talepleri (canlı /api/requests) ───────── */
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${hh}:${mm}`;
}

function reqStatus(s: string): { tone: 'good' | 'champagne' | 'cream'; label: string } {
  if (s === 'handled' || s === 'islendi') return { tone: 'good', label: 'İşlendi' };
  if (s === 'new') return { tone: 'champagne', label: 'Yeni' };
  return { tone: 'cream', label: s };
}

function WhatsAppTalepleri() {
  const [items, setItems] = useState<ClinicRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    listRequests()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
          <div style={{ fontSize: 14, fontWeight: 600 }}>WhatsApp Talepleri</div>
          <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>· bot "Diğer" akışından gelen gerçek mesajlar</span>
        </div>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={load} disabled={loading}>
          {loading ? '…' : 'Yenile'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--bad)', padding: '12px 20px' }}>
          {error} — API çalışıyor mu? (uvicorn :8000)
        </div>
      )}
      {!error && loading && !items && (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '16px 20px' }}>Yükleniyor…</div>
      )}
      {!error && items && items.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '16px 20px' }}>
          Henüz talep yok. WhatsApp'ta "Diğer" seçilip mesaj yazılınca burada görünür.
        </div>
      )}
      {items && items.length > 0 && (
        <div style={{ maxHeight: 5 * 52, overflowY: 'auto' }}>
          <table className="wl-table" style={{ width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 1 }}>
              <tr>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Mesaj</th>
                <th style={{ width: 90 }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const st = reqStatus(r.status);
                return (
                  <tr key={r.id}>
                    <td className="wl-mono" style={{ color: 'var(--ink-60)', whiteSpace: 'nowrap' }}>
                      {fmtDateTime(r.created_at)}
                    </td>
                    <td className="wl-mono" style={{ color: 'var(--ink-60)' }}>
                      {r.customer_name || maskPhone(r.phone)}
                    </td>
                    <td style={{ fontSize: 13 }}>{r.message}</td>
                    <td>
                      <Chip tone={st.tone} small>
                        {st.label}
                      </Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ───────── sayfa ───────── */
export default function RandevuTakvimi() {
  const [view, setView] = useState<'gun' | 'hafta'>('gun');
  const [selId, setSelId] = useState<string>('a5');

  const dayAppts = useMemo(() => APPTS.filter((a) => a.day === 5), []);
  const selected = APPTS.find((a) => a.id === selId) ?? dayAppts[0];

  const hours = Array.from({ length: (CLOSE - OPEN) / 60 + 1 }, (_, i) => OPEN + i * 60);

  const columns =
    view === 'gun'
      ? STAFF.map((s) => ({ id: s.key, title: s.name, sub: s.role, items: dayAppts.filter((a) => a.staff === s.key) }))
      : WEEK.map((w, i) => ({ id: String(i), title: w, sub: i === 5 ? '16 May' : '', items: APPTS.filter((a) => a.day === i) }));

  // Detay paneli açık/kapalı + açıkken takvim yüksekliği detay panele eşitlenir
  const [detayOpen, setDetayOpen] = useState(false);
  const detayRef = useRef<HTMLDivElement>(null);
  const [detayH, setDetayH] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = detayRef.current;
    if (!el) {
      setDetayH(undefined);
      return;
    }
    const ro = new ResizeObserver(([entry]) => setDetayH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [detayOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0 }}>
      {/* AI banner — takvim odaklı */}
      <div
        style={{
          background: 'linear-gradient(110deg, var(--paper) 0%, var(--paper) 52%, var(--lavender-soft) 100%)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lavender-soft)', display: 'grid', placeItems: 'center', color: 'var(--lavender-2)', flexShrink: 0 }}>
          {Icon.sparkle}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Chip tone="sage" small>Fırsat</Chip>
            <span>
              <strong>14:30 boş slot</strong> Ebru B.’de — <strong>Berfin Ç.</strong> %92 uyum, 2 dk önce WhatsApp’tan yazdı. Ayrıca <strong style={{ color: 'var(--bad)' }}>Pınar K. iptal riski %62</strong>.
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>
            AI takvimi 4 dk önce taradı · doluluk %87 · 2 boş slot · 1 risk
          </div>
        </div>
        <button className="wl-btn wl-btn-sm" style={{ background: 'var(--cream-2)', color: 'var(--ink)', borderRadius: 8, fontSize: 12 }}>
          Ön ödeme akışı
        </button>
        <button className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 8 }}>
          <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>Berfin’e gönder
        </button>
      </div>

      {/* kontrol satırı */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: 3 }}>
          {(['gun', 'hafta'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="wl-btn wl-btn-sm"
              style={{
                height: 28,
                borderRadius: 6,
                fontSize: 12,
                background: view === v ? 'var(--cream-2)' : 'transparent',
                color: view === v ? 'var(--ink)' : 'var(--ink-60)',
              }}
            >
              {v === 'gun' ? 'Gün' : 'Hafta'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ width: 32, padding: 0, justifyContent: 'center', borderRadius: 8 }}>
            {Icon.chevronLeft}
          </button>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>
            Bugün
          </button>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ width: 32, padding: 0, justifyContent: 'center', borderRadius: 8 }}>
            {Icon.chevronRight}
          </button>
          <div style={{ fontSize: 13, fontWeight: 600, marginLeft: 6 }}>
            {view === 'gun' ? 'Cumartesi · 16 Mayıs 2026' : '12 – 18 Mayıs 2026'}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-40)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {Icon.clock} Sürükle-bırak ile saat değiştir
          </span>
          {(Object.keys(CAT) as Cat[]).map((c) => (
            <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-60)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: CAT[c].bar }} />
              {CAT[c].label}
            </span>
          ))}
        </div>
      </div>

      {/* takvim + detay */}
      <div style={{ display: 'grid', gridTemplateColumns: detayOpen ? '1fr 332px' : '1fr', gap: 14, alignItems: 'start' }}>
        {/* ── takvim kartı ── */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: detayH }}>
          {/* kolon başlıkları */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
            <div style={{ width: 56, flexShrink: 0 }} />
            {columns.map((c) => (
              <div
                key={c.id}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderLeft: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {view === 'gun' && <Avatar name={c.title} i={Number(c.id === 'defne')} size={24} />}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-40)' }}>
                    {c.sub} · {c.items.length} randevu
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* grid */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', position: 'relative', height: GRID_H }}>
              {/* saat oluğu */}
              <div style={{ width: 56, flexShrink: 0, position: 'relative' }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{
                      position: 'absolute',
                      top: (h - OPEN) * PX_PER_MIN + TOP_PAD,
                      right: 8,
                      fontSize: 10,
                      color: 'var(--ink-40)',
                      fontFamily: 'Geist Mono, monospace',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {String(Math.floor(h / 60)).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {columns.map((col) => (
                <div
                  key={col.id}
                  style={{ flex: 1, position: 'relative', borderLeft: '1px solid var(--line)' }}
                >
                  {/* saat çizgileri */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: (h - OPEN) * PX_PER_MIN + TOP_PAD,
                        borderTop: '1px solid var(--line)',
                      }}
                    />
                  ))}

                  {/* AI boş slot (gün görünümü, Ebru kolonu) */}
                  {view === 'gun' && col.id === AI_SLOT.staff && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 6,
                        right: 6,
                        top: (toMin(AI_SLOT.start) - OPEN) * PX_PER_MIN + TOP_PAD + 2,
                        height: (toMin(AI_SLOT.end) - toMin(AI_SLOT.start)) * PX_PER_MIN - 4,
                        borderRadius: 8,
                        border: '1px dashed var(--lavender-2)',
                        background: 'var(--lavender-soft)',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--lavender-2)', display: 'flex' }}>{Icon.sparkle}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lavender-2)' }}>
                          {AI_SLOT.start} boş — AI önerisi
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--lavender-2)', fontStyle: 'italic' }}>
                        {AI_SLOT.client} · %{AI_SLOT.fit} uyum
                      </div>
                      <button
                        className="wl-btn wl-btn-sm"
                        style={{ marginTop: 'auto', alignSelf: 'flex-start', height: 24, fontSize: 11, background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 6 }}
                      >
                        Davet et
                      </button>
                    </div>
                  )}

                  {/* randevu blokları */}
                  {col.items.map((a) => {
                    const top = (toMin(a.start) - OPEN) * PX_PER_MIN;
                    const h = (toMin(a.end) - toMin(a.start)) * PX_PER_MIN;
                    const c = CAT[a.cat];
                    const active = a.id === selId;
                    return (
                      <div
                        key={a.id}
                        onClick={() => { setSelId(a.id); setDetayOpen(true); }}
                        style={{
                          position: 'absolute',
                          left: 6,
                          right: 6,
                          top: top + TOP_PAD + 2,
                          height: h - 4,
                          background: c.bg,
                          borderLeft: `3px solid ${c.bar}`,
                          borderRadius: 8,
                          padding: '7px 10px',
                          cursor: 'grab',
                          overflow: 'hidden',
                          outline: active ? '2px solid var(--ink)' : 'none',
                          outlineOffset: -1,
                          boxShadow: active ? '0 6px 18px -8px rgba(42,53,48,0.3)' : 'none',
                          transition: 'box-shadow .15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.client}
                          </span>
                          <span className="wl-mono" style={{ fontSize: 10, color: c.text, flexShrink: 0 }}>
                            {a.start}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: c.text, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.service}
                        </div>
                        {h > 68 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            {a.channel === 'wa' && (
                              <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
                            )}
                            {a.status === 'risk' && <Chip tone="blush" small>Risk %62</Chip>}
                            {a.status === 'devam' && <Chip tone="forest" small>Devam</Chip>}
                            {a.status === 'tamam' && <Chip tone="good" small>{Icon.check}</Chip>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── detay paneli ── */}
        {detayOpen && (
        <div ref={detayRef} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Randevu detayı</div>
            <span
              title="Detayı kapat"
              onClick={() => setDetayOpen(false)}
              style={{ color: 'var(--ink-40)', display: 'flex', cursor: 'pointer' }}
            >
              {Icon.x}
            </span>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={selected.client} i={2} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{selected.client}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {(selected.tags ?? ['Danışan']).map((t) => (
                    <Chip key={t} tone={t === 'VIP' ? 'lavender' : t === 'Risk' ? 'blush' : 'sage'} small>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            {selected.risk && (
              <div style={{ background: 'var(--blush-soft)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10 }}>
                <span style={{ color: 'var(--lavender-2)', display: 'flex', flexShrink: 0 }}>{Icon.sparkle}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--bad)', marginBottom: 3 }}>
                    AI · Risk uyarısı
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.45 }}>{selected.risk}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { ic: Icon.calendar, l: 'Tarih & saat', v: `Cumartesi · 16 May · ${selected.start}–${selected.end}` },
                { ic: Icon.sparkle, l: 'Hizmet', v: selected.service },
                { ic: Icon.user, l: 'Uzman', v: STAFF.find((s) => s.key === selected.staff)?.name ?? '' },
                { ic: Icon.wallet, l: 'Ücret', v: selected.price },
              ].map((row) => (
                <div key={row.l} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: 'var(--ink-40)', display: 'flex', marginTop: 1 }}>{row.ic}</span>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {row.l}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{row.v}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {channelChip(selected.channel)}
                {statusChip(selected.status)}
              </div>
            </div>

            {selected.note && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Not
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-60)', background: 'var(--cream)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
                  {selected.note}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="wl-btn wl-btn-sm" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8, justifyContent: 'center' }}>
                <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
                WhatsApp’tan hatırlat
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ flex: 1, borderRadius: 8, justifyContent: 'center' }}>
                  {Icon.edit}Yeniden planla
                </button>
                <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ flex: 1, borderRadius: 8, justifyContent: 'center', color: 'var(--bad)' }}>
                  İptal et
                </button>
              </div>
              <button className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-soft)', color: 'var(--lavender-2)', borderRadius: 8, justifyContent: 'center' }}>
                {Icon.sparkle}AI ile en uygun saati bul
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* WhatsApp aktivitesi (canlı) — takvimin altında yan yana ikincil panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <WhatsAppRandevulari />
        <WhatsAppTalepleri />
      </div>
    </div>
  );
}
