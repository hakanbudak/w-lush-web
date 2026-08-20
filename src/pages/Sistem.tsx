import { useState } from 'react';
import { Icon } from '../components/icons';
import WhatsAppConnect from '../components/WhatsAppConnect';
import GiderKategoriSection from '../components/sistem/GiderKategoriSection';
import PersonelSection from '../components/sistem/PersonelSection';
import HizmetSection from '../components/sistem/HizmetSection';
import PaketSection from '../components/sistem/PaketSection';
import AiSection from '../components/sistem/AiSection';
import GuvenlikSection from '../components/sistem/GuvenlikSection';
import KlinikBilgisi from '../components/sistem/KlinikBilgisi';
import SablonSection from '../components/sistem/SablonSection';

/* ───────── bölümler ───────── */
type Section = 'klinik' | 'personel' | 'hizmet' | 'whatsapp' | 'ai' | 'guvenlik';
const SECTIONS: { key: Section; label: string; icon: keyof typeof Icon; sub: string }[] = [
  { key: 'klinik', label: 'Klinik bilgisi', icon: 'home', sub: 'Tip, iletişim, çalışma saatleri' },
  { key: 'personel', label: 'Personel', icon: 'users', sub: 'Uzmanlar ve roller' },
  { key: 'hizmet', label: 'Hizmetler & paketler', icon: 'sparkle', sub: 'Fiyatlandırma' },
  { key: 'whatsapp', label: 'WhatsApp şablonları', icon: 'whatsapp', sub: 'Otomatik mesajlar' },
  { key: 'ai', label: 'AI asistan', icon: 'sparkle', sub: 'Davranış tercihleri' },
  { key: 'guvenlik', label: 'Güvenlik', icon: 'user', sub: 'İki adımlı doğrulama' },
];


// Hizmetler & paketler artık API'den geliyor (bkz. HizmetSection / PaketSection).

export default function Sistem() {
  // Derin bağlantı: /sistem?sec=whatsapp → ilgili bölümü doğrudan aç.
  const initialSec = new URLSearchParams(window.location.search).get('sec');
  const [sec, setSec] = useState<Section>(
    SECTIONS.some((s) => s.key === initialSec) ? (initialSec as Section) : 'klinik',
  );

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
          {/* Başlıkta genel bir "Kaydet" yok: her bölüm kendi kaydını yapıyor
              ve hiçbir şeye bağlı olmayan bir düğme, basanı yanıltır. */}
        </div>

        <div style={{ padding: 24, overflow: 'auto', flex: 1 }}>
          {sec === 'klinik' && <KlinikBilgisi />}

          {sec === 'personel' && <PersonelSection />}

          {sec === 'hizmet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <HizmetSection />
              <PaketSection />
              <GiderKategoriSection />
            </div>
          )}

          {sec === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
              <WhatsAppConnect />
              <SablonSection />
            </div>
          )}

          {sec === 'ai' && <AiSection />}

          {sec === 'guvenlik' && <GuvenlikSection />}
        </div>
      </div>
    </div>
  );
}
