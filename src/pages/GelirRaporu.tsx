import { useState } from 'react';
import { Icon } from '../components/icons';
import { Chip, KpiCard } from '../components/ui';

/* ───────── veri ───────── */
const CATEGORIES = [
  { name: 'Lazer Epilasyon', amount: 198_400, pct: 32, color: 'var(--champagne)', delta: '+8%', tone: 'good' as const },
  { name: 'Cilt Bakımı / Hydrafacial', amount: 156_200, pct: 25, color: 'var(--forest)', delta: '+12%', tone: 'good' as const },
  { name: 'Botoks / Dolgu', amount: 142_800, pct: 23, color: 'var(--lavender)', delta: '−4%', tone: 'bad' as const },
  { name: 'Mezoterapi', amount: 78_300, pct: 13, color: 'var(--sage)', delta: '+3%', tone: 'good' as const },
  { name: 'Konsültasyon / Diğer', amount: 43_140, pct: 7, color: 'var(--ink-40)', delta: '+1%', tone: 'good' as const },
];

const STAFF = [
  { name: 'Dr. Defne A.', role: 'Estetik dr.', sessions: 86, revenue: '₺ 248.600', avg: '₺ 2.890', goal: 112, tone: 'good' as const },
  { name: 'Ebru B.', role: 'Cilt uzmanı', sessions: 142, revenue: '₺ 196.400', avg: '₺ 1.383', goal: 98, tone: 'good' as const },
  { name: 'Selin K.', role: 'Lazer tekn.', sessions: 168, revenue: '₺ 142.300', avg: '₺ 847', goal: 91, tone: 'warn' as const },
  { name: 'Nil A.', role: 'Cilt uzmanı', sessions: 64, revenue: '₺ 31.540', avg: '₺ 493', goal: 62, tone: 'bad' as const },
];

const fmt = (n: number) => '₺ ' + n.toLocaleString('tr-TR');

export default function GelirRaporu() {
  const [period, setPeriod] = useState<'ay' | 'ceyrek' | 'yil'>('ay');
  const total = CATEGORIES.reduce((s, c) => s + c.amount, 0);

  return (
    <>
      {/* filtre satırı */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: 3 }}>
          {([['ay', 'Bu ay'], ['ceyrek', 'Çeyrek'], ['yil', 'Yıl']] as const).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setPeriod(k)}
              className="wl-btn wl-btn-sm"
              style={{ height: 28, borderRadius: 6, fontSize: 12, background: period === k ? 'var(--cream-2)' : 'transparent', color: period === k ? 'var(--ink)' : 'var(--ink-60)' }}
            >
              {lbl}
            </button>
          ))}
        </div>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>{Icon.calendar}1 – 16 Mayıs 2026</button>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>Maslak şubesi</button>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>Tüm hizmetler</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-soft)', color: 'var(--lavender-2)', borderRadius: 8, fontSize: 12 }}>{Icon.sparkle}AI rapor oluştur</button>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>{Icon.arrow}Dışa aktar</button>
        </div>
      </div>

      {/* KPI satırı */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Toplam gelir" value="₺ 618.840" delta="+12%" deltaTone="good" accent="var(--forest)" sparkline="M0,24 L25,22 L50,18 L75,16 L100,12 L125,14 L150,9 L175,7 L200,4" />
        <KpiCard label="Ortalama sepet" value="₺ 1.412" delta="+5%" deltaTone="good" accent="var(--sage)" sparkline="M0,18 L25,20 L50,16 L75,14 L100,15 L125,11 L150,12 L175,9 L200,8" />
        <KpiCard label="İşlem sayısı" value="438" delta="+7%" deltaTone="good" accent="var(--champagne)" sparkline="M0,26 L25,22 L50,23 L75,18 L100,16 L125,17 L150,12 L175,10 L200,9" />
        <KpiCard label="Tahsilat oranı" value="%94" delta="−2%" deltaTone="warn" accent="var(--lavender)" sparkline="M0,10 L25,9 L50,12 L75,11 L100,14 L125,12 L150,13 L175,15 L200,14" />
      </div>

      {/* AI tahmin */}
      <div style={{ background: 'linear-gradient(110deg, var(--paper) 0%, var(--paper) 52%, var(--lavender-soft) 100%)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lavender-soft)', display: 'grid', placeItems: 'center', color: 'var(--lavender-2)', flexShrink: 0 }}>{Icon.sparkle}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Chip tone="lavender" small>Tahmin</Chip>
            <span>Mayıs ay sonu <strong style={{ color: 'var(--lavender-2)' }}>₺ 1.18M</strong> öngörülüyor — hedefin <strong style={{ color: 'var(--sage-2)' }}>%7 üzerinde</strong>. <strong>Botoks/Dolgu −%4</strong>, kampanya ile telafi edilebilir.</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>AI · 438 işlem · son 16 gün · güven %86</div>
        </div>
        <button className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 8 }}>{Icon.sparkle}Kampanya öner</button>
      </div>

      {/* grafik + kategori */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        {/* trend grafiği */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Gelir trendi</div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>
                {period === 'yil' ? 'Oca – Ara 2026' : period === 'ceyrek' ? 'Q2 2026 · Nis–Haz' : '1–16 Mayıs · son 16 gün'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Bugüne kadar</div><div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>₺ 618.840</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>AI tahmini</div><div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--lavender-2)' }}>₺ 1.18M</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Hedef</div><div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--sage-2)' }}>₺ 1.10M</div></div>
            </div>
          </div>
          <svg viewBox="0 0 1200 200" preserveAspectRatio="none" style={{ width: '100%', height: 200, display: 'block' }}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--forest)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1="0" x2="1200" y1={20 + i * 40} y2={20 + i * 40} stroke="var(--line)" strokeWidth="1" />
            ))}
            <path d="M0,160 L75,150 L150,148 L225,128 L300,134 L375,108 L450,116 L525,92 L600,100 L675,72 L750,82 L825,56 L900,66 L975,42 L1050,50 L1125,30 L1200,24 L1200,200 L0,200 Z" fill="url(#gRev)" />
            <path d="M0,160 L75,150 L150,148 L225,128 L300,134 L375,108 L450,116 L525,92 L600,100 L675,72 L750,82 L825,56 L900,66 L975,42 L1050,50 L1125,30 L1200,24" fill="none" stroke="var(--forest)" strokeWidth="2" />
            <path d="M1200,24 L1290,12" fill="none" stroke="var(--lavender-2)" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="1125" cy="30" r="4" fill="var(--paper)" stroke="var(--forest)" strokeWidth="2" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-40)', fontFamily: 'Geist Mono, monospace' }}>
            {['1', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '23', '25', '27', '29', '31'].map((d) => <span key={d}>{d}</span>)}
          </div>
        </div>

        {/* kategori dağılımı */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Hizmet kategorisi</div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>Toplam {fmt(total)}</div>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {CATEGORIES.map((c) => (
              <div key={c.name}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color }} />
                    {c.name}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="wl-mono" style={{ color: 'var(--ink-60)' }}>{fmt(c.amount)}</span>
                    <span style={{ color: c.tone === 'bad' ? 'var(--bad)' : 'var(--sage-2)', fontSize: 11 }}>{c.delta}</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--cream-2)', overflow: 'hidden' }}>
                  <div style={{ width: `${c.pct}%`, height: '100%', background: c.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* personel performansı */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Personel performansı</div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>Mayıs · gelir ve hedefe ulaşma</div>
          </div>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>{Icon.arrow}Detay rapor</button>
        </div>
        <table className="wl-table">
          <thead>
            <tr>
              <th>Uzman</th>
              <th style={{ textAlign: 'right' }}>Seans</th>
              <th style={{ textAlign: 'right' }}>Gelir</th>
              <th style={{ textAlign: 'right' }}>Ort. sepet</th>
              <th style={{ width: 220 }}>Hedefe ulaşma</th>
            </tr>
          </thead>
          <tbody>
            {STAFF.map((s, i) => (
              <tr key={s.name}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, background: ['var(--forest)', 'var(--sage)', 'var(--champagne)', 'var(--lavender)'][i % 4], color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 500 }}>
                      {s.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>{s.role}</div>
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }} className="wl-mono">{s.sessions}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }} className="wl-mono">{s.revenue}</td>
                <td style={{ textAlign: 'right' }} className="wl-mono">{s.avg}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--cream-2)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(s.goal, 100)}%`, height: '100%', background: s.tone === 'bad' ? 'var(--blush)' : s.tone === 'warn' ? 'var(--champagne)' : 'var(--sage)' }} />
                    </div>
                    <Chip tone={s.tone === 'bad' ? 'blush' : s.tone === 'warn' ? 'champagne' : 'good'} small>%{s.goal}</Chip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
