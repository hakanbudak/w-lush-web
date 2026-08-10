import { useState, type ReactNode } from 'react';
import { Icon } from '../components/icons';
import { Chip } from '../components/ui';
import WhatsAppConnect from '../components/WhatsAppConnect';
import GiderKategoriSection from '../components/sistem/GiderKategoriSection';
import PersonelSection from '../components/sistem/PersonelSection';
import HizmetSection from '../components/sistem/HizmetSection';
import PaketSection from '../components/sistem/PaketSection';
import RandevuAyarlari from '../components/sistem/RandevuAyarlari';
import { Toggle } from '../components/sistem/ui';

/* ───────── yardımcılar ───────── */
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


// Hizmetler & paketler artık API'den geliyor (bkz. HizmetSection / PaketSection).

const TEMPLATES = [
  { name: 'Randevu hatırlatma', when: '24 saat önce · otomatik', text: 'Merhaba {ad} 🌿 {tarih} {saat} {uzman} ile randevunuzu hatırlatırız. Onaylamak için 1, ertelemek için 2 yazabilirsiniz.' },
  { name: 'Randevu onayı', when: 'Randevu oluşunca', text: 'Randevunuz oluşturuldu ✅ {tarih} {saat} · {hizmet} · {uzman}. Görüşmek üzere!' },
  { name: 'Kampanya / yeniden kazanım', when: 'AI önerisiyle', text: '{ad}, sizi özledik 💚 {hizmet} için size özel %{indirim} indirim tanımladık. Detay için yazmanız yeterli.' },
];
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
