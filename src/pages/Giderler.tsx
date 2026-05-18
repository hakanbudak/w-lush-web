import { useState } from 'react';
import { Icon } from '../components/icons';
import { Chip, KpiCard } from '../components/ui';

/* ───────── veri ───────── */
const CATEGORIES = [
  { name: 'Personel & maaş', amount: 184_500, pct: 41, color: 'var(--forest)', delta: '+2%', tone: 'good' as const },
  { name: 'Kira & aidat', amount: 92_000, pct: 20, color: 'var(--champagne)', delta: '0%', tone: 'good' as const },
  { name: 'Ürün & sarf', amount: 76_300, pct: 17, color: 'var(--sage)', delta: '+6%', tone: 'good' as const },
  { name: 'Pazarlama', amount: 58_200, pct: 13, color: 'var(--lavender)', delta: '+38%', tone: 'bad' as const, flag: true },
  { name: 'Cihaz & bakım', amount: 28_400, pct: 6, color: 'var(--blush)', delta: '+11%', tone: 'warn' as const },
  { name: 'Vergi & SGK', amount: 14_900, pct: 3, color: 'var(--ink-40)', delta: '+1%', tone: 'good' as const },
];

const MONTHS = [
  { m: 'Oca', v: 392 },
  { m: 'Şub', v: 408 },
  { m: 'Mar', v: 421 },
  { m: 'Nis', v: 438 },
  { m: 'May', v: 454, current: true },
];

interface Exp {
  d: string;
  cat: string;
  desc: string;
  method: string;
  amount: string;
  flag?: string;
}
const RECENT: Exp[] = [
  { d: '15 May', cat: 'Pazarlama', desc: 'Instagram reklam kampanyası', method: 'Kredi kartı', amount: '₺ 24.800', flag: '+%38 anormal' },
  { d: '14 May', cat: 'Ürün & sarf', desc: 'Hydrafacial serum & başlık', method: 'Havale', amount: '₺ 18.600' },
  { d: '12 May', cat: 'Personel & maaş', desc: 'Mayıs avans ödemesi', method: 'Banka', amount: '₺ 42.000' },
  { d: '10 May', cat: 'Cihaz & bakım', desc: 'Lazer cihazı periyodik bakım', method: 'Havale', amount: '₺ 9.400', flag: 'plan dışı' },
  { d: '08 May', cat: 'Kira & aidat', desc: 'Maslak şube kira', method: 'Banka', amount: '₺ 46.000' },
  { d: '05 May', cat: 'Vergi & SGK', desc: 'SGK prim ödemesi', method: 'Banka', amount: '₺ 14.900' },
  { d: '03 May', cat: 'Ürün & sarf', desc: 'Mezoterapi solüsyon', method: 'Kredi kartı', amount: '₺ 7.200' },
];

const fmt = (n: number) => '₺ ' + n.toLocaleString('tr-TR');
const maxV = Math.max(...MONTHS.map((m) => m.v));

export default function Giderler() {
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
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>Tüm kategoriler</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>{Icon.arrow}Dışa aktar</button>
          <button className="wl-btn wl-btn-sm" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}>{Icon.plus}Gider ekle</button>
        </div>
      </div>

      {/* KPI satırı */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard label="Toplam gider" value="₺ 454.300" delta="+4%" deltaTone="warn" accent="var(--blush)" sparkline="M0,20 L25,19 L50,17 L75,18 L100,15 L125,14 L150,13 L175,12 L200,11" />
        <KpiCard label="Sabit giderler" value="₺ 290.500" delta="+1%" deltaTone="good" accent="var(--forest)" sparkline="M0,16 L25,16 L50,15 L75,15 L100,14 L125,14 L150,14 L175,13 L200,13" />
        <KpiCard label="Değişken giderler" value="₺ 163.800" delta="+12%" deltaTone="bad" accent="var(--lavender)" sparkline="M0,24 L25,22 L50,21 L75,18 L100,16 L125,17 L150,12 L175,10 L200,7" />
        <KpiCard label="Gider / gelir oranı" value="%73" delta="−3%" deltaTone="good" accent="var(--sage)" sparkline="M0,12 L25,13 L50,11 L75,12 L100,10 L125,11 L150,9 L175,10 L200,8" />
      </div>

      {/* AI flag */}
      <div style={{ background: 'linear-gradient(110deg, var(--paper) 0%, var(--paper) 52%, var(--blush-soft) 100%)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lavender-soft)', display: 'grid', placeItems: 'center', color: 'var(--lavender-2)', flexShrink: 0 }}>{Icon.sparkle}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Chip tone="blush" small>Anomali</Chip>
            <span><strong>Pazarlama gideri +%38</strong> (beklenenin ₺16K üzerinde). Kira & maaş normal. <strong>2 kalem</strong> AI tarafından işaretlendi.</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>AI · 7 yeni kalem · son tarama 6 dk önce · güven %88</div>
        </div>
        <button className="wl-btn wl-btn-sm" style={{ background: 'var(--cream-2)', color: 'var(--ink)', borderRadius: 8, fontSize: 12 }}>Kalemleri gör</button>
        <button className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 8 }}>{Icon.sparkle}Bütçe önerisi</button>
      </div>

      {/* trend + kategori */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        {/* aylık trend bar */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Aylık gider trendi</div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>
                {period === 'yil' ? 'Oca – Ara 2026 (bin ₺)' : period === 'ceyrek' ? 'Q2 2026 (bin ₺)' : 'Oca – May 2026 · bin ₺'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Bu ay</div><div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>₺ 454K</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Bütçe</div><div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--sage-2)' }}>₺ 440K</div></div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, height: 196, padding: '0 8px', borderBottom: '1px solid var(--line)', position: 'relative' }}>
            {/* bütçe çizgisi */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: (440 / maxV) * 168, borderTop: '1px dashed var(--sage-2)' }}>
              <span style={{ position: 'absolute', right: 0, top: -16, fontSize: 10, color: 'var(--sage-2)' }}>Bütçe</span>
            </div>
            {MONTHS.map((m) => (
              <div key={m.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 56,
                    height: (m.v / maxV) * 168,
                    background: m.current ? 'var(--lavender)' : 'var(--forest-3)',
                    borderRadius: '8px 8px 0 0',
                    position: 'relative',
                  }}
                >
                  <span style={{ position: 'absolute', top: -20, left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: 600, color: m.current ? 'var(--lavender-2)' : 'var(--ink-60)', fontFamily: 'Geist Mono, monospace' }}>
                    {m.v}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>{m.m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* kategori dağılımı */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Kategori dağılımı</div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>Toplam {fmt(total)}</div>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 15 }}>
            {CATEGORIES.map((c) => (
              <div key={c.name}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color }} />
                    {c.name}
                    {c.flag && <Chip tone="lavender" small>{Icon.sparkle}AI</Chip>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="wl-mono" style={{ color: 'var(--ink-60)' }}>{fmt(c.amount)}</span>
                    <span style={{ color: c.tone === 'bad' ? 'var(--bad)' : c.tone === 'warn' ? 'var(--champagne-2)' : 'var(--sage-2)', fontSize: 11 }}>{c.delta}</span>
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

      {/* son giderler */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Son giderler</div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>Mayıs · 7 kalem · 2 AI işaretli</div>
          </div>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>Tümü</button>
        </div>
        <table className="wl-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Tarih</th>
              <th>Kategori</th>
              <th>Açıklama</th>
              <th>Ödeme</th>
              <th>AI</th>
              <th style={{ textAlign: 'right' }}>Tutar</th>
            </tr>
          </thead>
          <tbody>
            {RECENT.map((e, i) => (
              <tr key={i} style={e.flag ? { background: 'var(--lavender-soft)' } : undefined}>
                <td><span className="wl-mono" style={{ fontSize: 12 }}>{e.d}</span></td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: CATEGORIES.find((c) => c.name === e.cat)?.color ?? 'var(--ink-40)' }} />
                    {e.cat}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{e.desc}</td>
                <td><Chip tone="cream" small>{e.method}</Chip></td>
                <td>{e.flag ? <Chip tone="lavender" small>{Icon.sparkle}{e.flag}</Chip> : <span style={{ color: 'var(--ink-20)' }}>—</span>}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }} className="wl-mono">{e.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
