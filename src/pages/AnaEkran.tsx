import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons';
import { KpiCard } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import {
  listAppointments,
  listRequests,
  listServices,
  type Appointment,
  type ClinicRequest,
  type Service,
} from '../api/clinic';
import { getConnection } from '../api/whatsapp';
import {
  CampaignModal,
  MessageComposerModal,
  SuggestionsModal,
  type Suggestion,
} from '../components/modals';

interface ApptRow {
  t: string;
  n: string;
  s: string;
  u: string;
  c: 'wa' | 'web' | 'man' | 'ai';
  d: string;
  dt: 'good' | 'forest' | 'cream' | 'warn' | 'ai';
  empty?: boolean;
}

const APPTS: ApptRow[] = [
  { t: '09:00', n: 'Duygu Özsever', s: 'Hydrafacial · Premium', u: 'Ebru B.', c: 'wa', d: 'Tamamlandı', dt: 'good' },
  { t: '10:15', n: 'Selin Akın', s: 'Lazer Epilasyon', u: 'Selin K.', c: 'wa', d: 'Devam ediyor', dt: 'forest' },
  { t: '11:30', n: 'Cem Yıldırım', s: 'Konsültasyon · Botoks', u: 'Dr. Defne', c: 'man', d: 'Onaylı', dt: 'cream' },
  { t: '13:00', n: 'Aslı Demir', s: 'Mezoterapi + Cilt', u: 'Ebru B.', c: 'wa', d: 'Onaylı', dt: 'cream' },
  { t: '14:30', n: 'Boş slot', s: 'AI: Berfin Ç. %92 uyum', u: 'Ebru B.', c: 'ai', d: 'Doldur', dt: 'ai', empty: true },
  { t: '15:45', n: 'Pınar Kaya', s: 'Dolgu · Dudak revizyon', u: 'Dr. Defne', c: 'wa', d: 'Risk %62', dt: 'warn' },
  { t: '17:00', n: 'Murat Aksoy', s: 'Cilt analizi · İlk seans', u: 'Ebru B.', c: 'web', d: 'Onaylı', dt: 'cream' },
];

const SUGGESTIONS: Suggestion[] = [
  { tone: 'warn', tag: 'Eğilim ↓', title: 'Lazer epilasyon −%23 bu ay', sub: 'Yaz kampanyası önerebilirim', cta: 'Kampanya hazırla' },
  { tone: 'warn', tag: 'Eğilim ↓', title: 'Cilt bakımı son 2 haftada −%15', sub: '18 sadık danışana özel indirim', cta: 'Liste + metin' },
  { tone: 'sage', tag: 'Fırsat', title: '14:30 slotunu Berfin Ç. doldursun', sub: '%92 uyum · 2 dk önce WA', cta: 'WA gönder' },
  { tone: 'blush', tag: 'Risk', title: 'Pınar K. iptal riski %62', sub: 'Ön ödeme akışı öner', cta: 'Akış uygula' },
  { tone: 'lavender', tag: 'Gelir', title: '+₺ 28K paket fırsatı', sub: '12 danışan tekil → pakete uygun', cta: 'Listele' },
];

const INBOX = [
  { n: 'Berfin Çağlar', m: "Cumartesiyi 16:00'a alabilir miyiz?", t: '2 dk', u: 2, ai: true },
  { n: '+90 555 312 ••', m: 'Mezoterapi fiyat?', t: '21 dk', u: 1, lead: true, ai: true },
  { n: 'Ezgi Uçar', m: 'Çarşamba 11:00 uygun mu?', t: '1 sa', u: 1, ai: true },
  { n: 'Ceren Ö.', m: 'Teşekkürler! 💚', t: '2 sa', u: 0 },
];

function RichDashboard() {
  const [apptView, setApptView] = useState<'liste' | 'takvim'>('liste');
  const [modal, setModal] = useState<'campaign' | 'suggestions' | null>(null);
  const [msgTo, setMsgTo] = useState<string | null>(null);

  return (
    <>
      {/* AI quick banner — trend-aware */}
      <div style={{ background: 'linear-gradient(110deg, var(--paper) 0%, var(--paper) 55%, var(--lavender-soft) 100%)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lavender-soft)', display: 'grid', placeItems: 'center', color: 'var(--lavender-2)', flexShrink: 0 }}>{Icon.sparkle}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="wl-chip wl-chip-warn" style={{ height: 18, fontSize: 10 }}>Eğilim</span>
            <span>
              <strong>Lazer epilasyon</strong> bu ay <strong style={{ color: 'var(--bad)' }}>−%23</strong>, <strong>cilt bakımı</strong> <strong style={{ color: 'var(--bad)' }}>−%15</strong>. Bir kampanya bu boşluğu kapatabilir.
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>AI son taramayı 4 dk önce yaptı · son 30 gün vs önceki 30 gün · 247 danışan</div>
        </div>
        <button onClick={() => setModal('campaign')} className="wl-btn wl-btn-sm" style={{ background: 'var(--cream-2)', color: 'var(--ink)', borderRadius: 8, fontSize: 12 }}>Kampanyayı gör</button>
        <button onClick={() => setModal('suggestions')} className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 8 }}>{Icon.sparkle}Tüm öneriler</button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Günlük gelir" value="₺ 48.420" delta="+12%" deltaTone="good" accent="var(--forest)" sparkline="M0,22 L20,20 L40,18 L60,14 L80,16 L100,10 L120,12 L140,8 L160,10 L180,6 L200,4" />
        <KpiCard label="Doluluk" value="%87" delta="14/16" deltaTone="good" accent="var(--sage)" sparkline="M0,20 L25,18 L50,16 L75,12 L100,14 L125,10 L150,8 L175,12 L200,6" />
        <KpiCard label="Yeni aday" value="7" delta="+3 bugün" deltaTone="good" accent="var(--champagne)" sparkline="M0,28 L25,24 L50,22 L75,18 L100,20 L125,14 L150,16 L175,10 L200,8" />
        <KpiCard label="Bekleyen WA" value="12" delta="AI hazır" deltaTone="warn" accent="var(--lavender)" sparkline="M0,16 L25,18 L50,14 L75,16 L100,12 L125,14 L150,10 L175,12 L200,8" />
      </div>

      {/* Main 2-col: appointments + side stack */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        {/* Today's appointments */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Bugünün randevuları</div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>09:00 — 19:30 · 14 seans · 2 boş slot</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Link to="/randevu" className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 6, fontSize: 12, textDecoration: 'none' }}>
                Takvimde aç {Icon.arrow}
              </Link>
              {(['liste', 'takvim'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setApptView(v)}
                  className="wl-btn wl-btn-ghost wl-btn-sm"
                  style={{ borderRadius: 6, fontSize: 12, background: apptView === v ? 'var(--cream-2)' : 'transparent' }}
                >
                  {v === 'liste' ? 'Liste' : 'Takvim'}
                </button>
              ))}
            </div>
          </div>

          {apptView === 'liste' ? (
            <table className="wl-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Saat</th>
                  <th>Danışan</th>
                  <th>Hizmet</th>
                  <th>Uzman</th>
                  <th>Kanal</th>
                  <th style={{ width: 110 }}>Durum</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {APPTS.map((r, i) => (
                  <tr key={i} style={r.empty ? { background: 'var(--lavender-soft)' } : undefined}>
                    <td><span className="wl-mono" style={{ fontSize: 12 }}>{r.t}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {!r.empty && (
                          <div style={{ width: 26, height: 26, borderRadius: 999, background: ['var(--forest)', 'var(--sage)', 'var(--champagne)', 'var(--lavender)'][i % 4], color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 500 }}>
                            {r.n.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                          </div>
                        )}
                        {r.empty && <span style={{ color: 'var(--lavender-2)' }}>{Icon.sparkle}</span>}
                        <span style={{ fontSize: 13, fontWeight: r.empty ? 400 : 500, color: r.empty ? 'var(--lavender-2)' : 'var(--ink)', fontStyle: r.empty ? 'italic' : 'normal' }}>{r.n}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>{r.s}</td>
                    <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>{r.u}</td>
                    <td>
                      {r.c === 'wa' && <span className="wl-chip wl-chip-wa">{Icon.whatsapp}WA</span>}
                      {r.c === 'web' && <span className="wl-chip wl-chip-cream">Web</span>}
                      {r.c === 'man' && <span className="wl-chip wl-chip-cream">Manuel</span>}
                      {r.c === 'ai' && <span className="wl-chip wl-chip-lavender">{Icon.sparkle}AI</span>}
                    </td>
                    <td>
                      {r.dt === 'good' && <span className="wl-chip wl-chip-good">{Icon.check}{r.d}</span>}
                      {r.dt === 'forest' && <span className="wl-chip" style={{ background: 'var(--cream-3)', color: 'var(--forest-2)' }}><span className="wl-dot" style={{ background: 'var(--forest)' }} />{r.d}</span>}
                      {r.dt === 'cream' && <span className="wl-chip wl-chip-cream">{r.d}</span>}
                      {r.dt === 'warn' && <span className="wl-chip wl-chip-warn">{r.d}</span>}
                      {r.dt === 'ai' && (
                        <button onClick={() => setMsgTo('Berfin Çağlar')} className="wl-btn wl-btn-sm" style={{ height: 24, background: 'var(--lavender-2)', color: 'var(--cream)', fontSize: 11, borderRadius: 6 }}>
                          Davet et
                        </button>
                      )}
                    </td>
                    <td><span style={{ color: 'var(--ink-40)', cursor: 'pointer' }}>{Icon.more}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {APPTS.map((r, i) => {
                const bar = r.empty ? 'var(--lavender)' : ['var(--forest)', 'var(--sage)', 'var(--champagne)', 'var(--lavender)'][i % 4];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span className="wl-mono" style={{ fontSize: 12, color: 'var(--ink-40)', width: 44, flexShrink: 0 }}>{r.t}</span>
                    <div style={{ flex: 1, background: r.empty ? 'var(--lavender-soft)' : 'var(--cream)', borderLeft: `3px solid ${bar}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: r.empty ? 400 : 600, fontStyle: r.empty ? 'italic' : 'normal', color: r.empty ? 'var(--lavender-2)' : 'var(--ink)' }}>{r.n}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-60)', marginTop: 2 }}>{r.s} · {r.u}</div>
                      </div>
                      {r.c === 'wa' && <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>}
                      {r.empty
                        ? <button onClick={() => setMsgTo('Berfin Çağlar')} className="wl-btn wl-btn-sm" style={{ height: 24, background: 'var(--lavender-2)', color: 'var(--cream)', fontSize: 11, borderRadius: 6 }}>Davet et</button>
                        : <span className="wl-chip wl-chip-cream" style={{ height: 20, fontSize: 10 }}>{r.d}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* AI suggestions list */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--lavender-2)' }}>{Icon.sparkle}</span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>AI önerileri</div>
              <button onClick={() => setModal('suggestions')} style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--lavender-soft)', color: 'var(--lavender-2)', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Tümü · {SUGGESTIONS.length}
              </button>
            </div>
            {SUGGESTIONS.map((s, i, arr) => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer' }} onClick={() => setModal('suggestions')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className={`wl-chip wl-chip-${s.tone}`} style={{ height: 18, fontSize: 10, padding: '0 6px' }}>{s.tag}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4, marginBottom: 8 }}>{s.sub}</div>
                <button onClick={(e) => { e.stopPropagation(); setModal('suggestions'); }} className="wl-btn wl-btn-sm" style={{ height: 26, background: 'var(--cream-2)', color: 'var(--ink)', fontSize: 11, borderRadius: 6, padding: '0 10px' }}>
                  {s.cta} →
                </button>
              </div>
            ))}
          </div>

          {/* WhatsApp inbox preview */}
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--wa-green)' }}>{Icon.whatsapp}</span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp</div>
              <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#DCF8C6', color: '#075E54', fontWeight: 600 }}>12 yeni</span>
            </div>
            {INBOX.map((m, i, arr) => (
              <div key={i} onClick={() => setMsgTo(m.n)} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: m.lead ? 'var(--champagne)' : 'var(--cream-3)', color: m.lead ? 'var(--cream)' : 'var(--ink)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 500 }}>
                  {m.n.replace(/[+0-9]/g, '').trim().split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {m.n}
                      {m.lead && <span style={{ fontSize: 9, padding: '0 4px', borderRadius: 3, background: 'var(--champagne-3)', color: 'var(--champagne-2)' }}>Aday</span>}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--ink-40)' }}>{m.t}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-60)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.ai && <span style={{ color: 'var(--lavender-2)' }}>✦ </span>}
                    {m.m}
                  </div>
                </div>
                {m.u > 0 && (
                  <div style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--wa-green)', color: 'var(--paper)', fontSize: 9, display: 'grid', placeItems: 'center', fontWeight: 700 }}>{m.u}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Revenue chart full width */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Mayıs · gelir trendi</div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>1–16 Mayıs · son 16 gün</div>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Bugüne kadar</div><div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>₺ 612.840</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>AI ay sonu tahmini</div><div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--lavender-2)' }}>₺ 1.18M</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Hedef</div><div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--sage-2)' }}>₺ 1.10M</div></div>
          </div>
        </div>
        <svg viewBox="0 0 1200 180" preserveAspectRatio="none" style={{ width: '100%', height: 180, display: 'block' }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--forest)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1="0" x2="1200" y1={40 + i * 40} y2={40 + i * 40} stroke="var(--line)" strokeWidth="1" />
          ))}
          <path d="M0,150 L75,140 L150,135 L225,115 L300,125 L375,100 L450,108 L525,85 L600,95 L675,68 L750,78 L825,52 L900,62 L975,40 L1050,48 L1125,28 L1200,22 L1200,180 L0,180 Z" fill="url(#revGrad)" />
          <path d="M0,150 L75,140 L150,135 L225,115 L300,125 L375,100 L450,108 L525,85 L600,95 L675,68 L750,78 L825,52 L900,62 L975,40 L1050,48 L1125,28 L1200,22" fill="none" stroke="var(--forest)" strokeWidth="2" />
          <path d="M1200,22 L1320,8" fill="none" stroke="var(--lavender-2)" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="1125" cy="28" r="4" fill="var(--paper)" stroke="var(--forest)" strokeWidth="2" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-40)', fontFamily: 'Geist Mono, monospace' }}>
          {['1', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '23', '25', '27', '29', '31'].map((d) => <span key={d}>{d}</span>)}
        </div>
      </div>

      {modal === 'campaign' && <CampaignModal onClose={() => setModal(null)} />}
      {modal === 'suggestions' && <SuggestionsModal items={SUGGESTIONS} onClose={() => setModal(null)} />}
      {msgTo && <MessageComposerModal presetTo={msgTo} onClose={() => setMsgTo(null)} />}
    </>
  );
}

/* ── İlk-deneyim dashboard'u (yeni / verisi boş klinik) ───── */
type Step = { done: boolean; title: string; sub: string; cta: { label: string; to: string } | null };

function FirstTimeDashboard({ clinicName }: { clinicName: string }) {
  const [waConnected, setWaConnected] = useState(false);
  const [services, setServices] = useState<Service[] | null>(null);

  // WhatsApp adımı gerçek bağlantı durumunu yansıtsın (bağlıysa ✓) +
  // gerçek hizmet listesini çek (panel boş görünmesin).
  useEffect(() => {
    getConnection()
      .then((c) => setWaConnected(c.status === 'connected'))
      .catch(() => {});
    listServices()
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  const steps: Step[] = [
    {
      done: true,
      title: 'Hesabını oluşturdun',
      sub: `${clinicName} panele hazır`,
      cta: null,
    },
    {
      done: false,
      title: 'Hizmet & fiyatların',
      sub: '5 örnek hizmet hazır — kendine göre düzenle',
      cta: { label: 'Düzenle', to: '/sistem?sec=hizmet' },
    },
    {
      done: waConnected,
      title: "WhatsApp'ı bağla",
      sub: waConnected ? 'Bağlandı — bot randevu alabilir' : 'Bot randevu almaya başlasın',
      cta: waConnected ? null : { label: 'Bağla', to: '/sistem?sec=whatsapp' },
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  const howItWorks = [
    { icon: Icon.whatsapp, color: 'var(--wa-green)', title: 'Müşteri WhatsApp’tan yazar', sub: 'Kliniğinin numarasına mesaj atar.' },
    { icon: Icon.calendar, color: 'var(--forest)', title: 'Bot karşılar, randevu alır', sub: 'Uygun saati sunar, fiyat sorusunu yanıtlar.' },
    { icon: Icon.check, color: 'var(--sage-2)', title: 'Panelde görür, yönetirsin', sub: 'Randevu burada listelenir; onayla ya da ertele.' },
  ];

  return (
    <>
      {/* Hero — tam genişlik */}
      <div
        style={{
          background: 'linear-gradient(120deg, var(--paper) 0%, var(--paper) 45%, var(--lavender-soft) 130%)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 14px 44px -30px rgba(42,53,48,0.28)',
        }}
      >
        {/* başlık */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--lavender-soft)', display: 'grid', placeItems: 'center', color: 'var(--lavender-2)', flexShrink: 0 }}>
            {Icon.sparkle}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Hoş geldin, {clinicName}! 👋
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 2 }}>
              Kliniğini birkaç adımda canlıya al — tamamladıkça panelin dolmaya başlar.
            </div>
          </div>
        </div>

        {/* ilerleme */}
        <div style={{ margin: '22px 0 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-60)' }}>Kurulum</span>
            <span className="wl-mono" style={{ fontSize: 11, color: 'var(--ink-40)' }}>{doneCount}/{steps.length} adım · %{pct}</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--cream-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'linear-gradient(90deg, var(--sage) 0%, var(--forest) 100%)', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* adım kartları */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: 'var(--paper)',
                border: `1px solid ${s.done ? 'var(--sage)' : 'var(--line)'}`,
                borderRadius: 12,
                padding: 16,
                minHeight: 128,
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 999, background: s.done ? 'var(--sage)' : 'var(--cream-2)', color: s.done ? 'var(--cream)' : 'var(--ink-60)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 }}>
                {s.done ? Icon.check : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-60)', marginTop: 3, lineHeight: 1.45 }}>{s.sub}</div>
              </div>
              {s.cta ? (
                <Link
                  to={s.cta.to}
                  className="wl-btn wl-btn-sm"
                  style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8, fontSize: 12, textDecoration: 'none', justifyContent: 'center' }}
                >
                  {s.cta.label} {Icon.arrow}
                </Link>
              ) : (
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--sage-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {Icon.check} Tamamlandı
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Alt satır: gerçek hizmet listesi + nasıl çalışır */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        {/* Hizmetlerin (gerçek veri) */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              Hizmetlerin
              {services && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-40)' }}>{services.length} hizmet</span>}
            </div>
            <Link to="/sistem?sec=hizmet" className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12, textDecoration: 'none' }}>
              Düzenle {Icon.arrow}
            </Link>
          </div>
          {services === null ? (
            <div style={{ padding: 24, fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
          ) : services.length === 0 ? (
            <div style={{ padding: 24, fontSize: 12, color: 'var(--ink-40)' }}>
              Henüz hizmet yok. <Link to="/sistem?sec=hizmet" style={{ color: 'var(--forest)' }}>Ekle →</Link>
            </div>
          ) : (
            services.map((s, i, arr) => (
              <div key={s.id} style={{ padding: '12px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 13, color: s.active ? 'var(--ink)' : 'var(--ink-40)' }}>{s.name}</span>
                {!s.active && <span className="wl-chip wl-chip-cream" style={{ height: 18, fontSize: 10 }}>Pasif</span>}
                <span className="wl-mono" style={{ fontSize: 13, fontWeight: 500 }}>₺ {s.price.toLocaleString('tr-TR')}</span>
              </div>
            ))
          )}
        </div>

        {/* Nasıl çalışır */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', fontSize: 14, fontWeight: 600 }}>Nasıl çalışır?</div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {howItWorks.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center', color: h.color, flexShrink: 0 }}>
                  {h.icon}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{h.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-60)', marginTop: 2, lineHeight: 1.45 }}>{h.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Veri-farkında sarmalayıcı: boş klinik → ilk-deneyim ──── */
export default function AnaEkran() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [reqs, setReqs] = useState<ClinicRequest[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listAppointments(), listRequests()])
      .then(([a, r]) => {
        setAppts(a);
        setReqs(r);
      })
      .catch(() => {
        setAppts([]);
        setReqs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-40)', fontSize: 13 }}>
        Yükleniyor…
      </div>
    );
  }

  const hasData = (appts?.length ?? 0) > 0 || (reqs?.length ?? 0) > 0;
  if (!hasData) {
    return <FirstTimeDashboard clinicName={user?.clinic.name ?? 'klinik'} />;
  }
  return <RichDashboard />;
}
