import { useState } from 'react';
import { Icon } from '../components/icons';
import { Avatar, Chip } from '../components/ui';

/* ───────── veri ───────── */
const TEMPLATES = [
  { key: 'ozet', name: 'Mayıs özet raporu', desc: 'Gelir, doluluk, yeni danışan, AI öne çıkanlar', icon: 'home' as const, last: '1 Mayıs’ta üretildi', tone: 'forest' as const },
  { key: 'vip', name: 'VIP danışan analizi', desc: 'En değerli 20 danışan · harcama · sadakat · risk', icon: 'user' as const, last: '12 gün önce', tone: 'lavender' as const },
  { key: 'personel', name: 'Personel performansı', desc: 'Uzman bazında gelir, seans ve hedefe ulaşma', icon: 'users' as const, last: '4 gün önce', tone: 'sage' as const },
  { key: 'gg', name: 'Gelir vs gider', desc: 'Kâr/zarar, kategori dağılımı, AI tahmin', icon: 'trending' as const, last: '4 gün önce', tone: 'champagne' as const },
  { key: 'funnel', name: 'Aday dönüşüm hunisi', desc: 'CRM funnel, kanal performansı, dönüşüm oranı', icon: 'chart' as const, last: 'Henüz üretilmedi', tone: 'champagne' as const },
  { key: 'noshow', name: 'No-show & iptal analizi', desc: 'İptal eden danışanlar, risk skoru, kayıp gelir', icon: 'calendar' as const, last: '20 gün önce', tone: 'blush' as const },
];

const PROMPTS = [
  'Son 3 ayın VIP danışanları ve toplam harcamaları',
  'Lazer kategorisindeki düşüşün olası nedenleri',
  'Hafta sonu doluluk trendi ve boş slot kaybı',
  'Pazarlama gideri artışının geri dönüşü',
];

const RECENT = [
  { name: 'Mayıs özet raporu', type: 'Şablon', by: 'Defne Aydın', d: '1 May 2026', fmt: 'PDF' },
  { name: 'VIP danışan analizi', type: 'AI özel', by: 'AI Asistan', d: '4 May 2026', fmt: 'Excel' },
  { name: 'Q1 gelir vs gider', type: 'Şablon', by: 'Defne Aydın', d: '12 Nis 2026', fmt: 'PDF' },
  { name: 'Lazer düşüş analizi', type: 'AI özel', by: 'AI Asistan', d: '12 Nis 2026', fmt: 'PDF' },
];

const SCHEDULED = [
  { name: 'Aylık özet raporu', when: 'Her ayın 1’i · 09:00', to: 'yönetim@w-lush.com', on: true },
  { name: 'Haftalık personel performansı', when: 'Pazartesi · 08:00', to: 'Defne Aydın', on: true },
  { name: 'Aylık AI fırsat raporu', when: 'Her ayın 15’i', to: 'yönetim@w-lush.com', on: false },
];

export default function Rapor() {
  const [prompt, setPrompt] = useState('');

  return (
    <>
      {/* AI rapor oluşturucu */}
      <div style={{ background: 'linear-gradient(110deg, var(--paper) 0%, var(--paper) 45%, var(--lavender-soft) 100%)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lavender-soft)', display: 'grid', placeItems: 'center', color: 'var(--lavender-2)' }}>{Icon.sparkle}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>AI özel rapor oluşturucu</div>
            <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 2 }}>Ne öğrenmek istediğinizi yazın — AI veriden raporu hazırlasın.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="wl-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Örn: Son 3 ayda en çok gelir getiren 10 danışan ve aldıkları hizmetler"
            style={{ flex: 1, height: 42 }}
          />
          <button className="wl-btn" style={{ background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 8, height: 42 }}>
            {Icon.sparkle}Rapor oluştur
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setPrompt(p)}
              style={{ border: '1px solid var(--line-strong)', background: 'var(--paper)', color: 'var(--ink-60)', fontFamily: 'inherit', fontSize: 12, padding: '6px 10px', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ color: 'var(--lavender-2)', display: 'flex' }}>{Icon.sparkle}</span>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* hazır şablonlar */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Hazır şablonlar</div>
          <span style={{ fontSize: 12, color: 'var(--ink-40)' }}>6 şablon · PDF & Excel</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {TEMPLATES.map((t) => (
            <div key={t.key} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center', color: 'var(--forest)' }}>{Icon[t.icon]}</div>
                <Chip tone={t.tone} small>Şablon</Chip>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 4, lineHeight: 1.45 }}>{t.desc}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icon.clock}{t.last}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                <button className="wl-btn wl-btn-sm" style={{ flex: 1, background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8, justifyContent: 'center' }}>Oluştur</button>
                <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }}>{Icon.arrow}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* son + zamanlanmış */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        {/* son raporlar */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Son oluşturulan raporlar</div>
            <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>Tümü</button>
          </div>
          <table className="wl-table">
            <thead>
              <tr><th>Rapor</th><th>Tür</th><th>Oluşturan</th><th>Tarih</th><th style={{ textAlign: 'right' }}>İndir</th></tr>
            </thead>
            <tbody>
              {RECENT.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td>{r.type === 'AI özel' ? <Chip tone="lavender" small>{Icon.sparkle}AI özel</Chip> : <Chip tone="cream" small>Şablon</Chip>}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={r.by} i={i} size={24} />
                      <span style={{ fontSize: 12, color: 'var(--ink-60)' }}>{r.by}</span>
                    </span>
                  </td>
                  <td><span className="wl-mono" style={{ fontSize: 12, color: 'var(--ink-60)' }}>{r.d}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>{r.fmt}{Icon.arrow}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* zamanlanmış */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Zamanlanmış raporlar</div>
            <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8, fontSize: 12 }}>{Icon.plus}Ekle</button>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SCHEDULED.map((s) => (
              <div key={s.name} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 3 }}>{s.when} · {s.to}</div>
                </div>
                <Chip tone={s.on ? 'good' : 'cream'} small>{s.on ? 'Aktif' : 'Duraklatıldı'}</Chip>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
