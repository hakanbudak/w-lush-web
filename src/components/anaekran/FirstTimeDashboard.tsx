import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSettings, listServices, type Service } from '../../api/clinic';
import { getConnection } from '../../api/whatsapp';
import { Icon } from '../icons';

/* ── İlk-deneyim dashboard'u (yeni / verisi boş klinik) ───── */
type Step = {
  done: boolean;
  title: string;
  sub: string;
  cta: { label: string; to: string } | null;
  /** Önceki adım tamamlanmadan yapılmaması gereken adım. */
  blocked?: boolean;
};

export default function FirstTimeDashboard({ clinicName }: { clinicName: string }) {
  const [waConnected, setWaConnected] = useState(false);
  const [services, setServices] = useState<Service[] | null>(null);
  const [hasContact, setHasContact] = useState(false);

  // WhatsApp adımı gerçek bağlantı durumunu yansıtsın (bağlıysa ✓) +
  // gerçek hizmet listesini çek (panel boş görünmesin).
  useEffect(() => {
    getConnection()
      .then((c) => setWaConnected(c.status === 'connected'))
      .catch(() => {});
    listServices()
      .then(setServices)
      .catch(() => setServices([]));
    getSettings()
      .then((s) =>
        setHasContact(
          Boolean(String(s.clinic_address ?? '').trim() || String(s.clinic_phone ?? '').trim()),
        ),
      )
      .catch(() => {});
  }, []);

  // Sıra keyfi değil: hizmeti olmayan klinikte bot çalışamıyor — randevu
  // akışı "hizmet yok" diyerek duruyor, fiyat sorusu yanıtsız kalıyor. O yüzden
  // WhatsApp adımı hizmetler girilene kadar kilitli.
  const hasServices = (services?.length ?? 0) > 0;
  const steps: Step[] = [
    {
      done: hasServices,
      title: 'Hizmetlerini ve fiyatlarını gir',
      sub: hasServices
        ? `${services?.length} hizmet tanımlı`
        : 'Bot bu listeden randevu alıyor ve fiyat soruluyor',
      cta: hasServices ? null : { label: 'Başla', to: '/kurulum' },
    },
    {
      done: hasContact,
      title: 'Klinik bilgilerin',
      sub: hasContact
        ? 'Adres ve telefon kayıtlı'
        : '"Neredesiniz?" en sık gelen soru — bot bunu senin yerine yanıtlasın',
      cta: hasContact ? null : { label: 'Doldur', to: '/sistem?sec=klinik' },
    },
    {
      done: waConnected,
      blocked: !hasServices,
      title: "WhatsApp'ı bağla",
      sub: waConnected
        ? 'Bağlandı — bot randevu alabilir'
        : hasServices
          ? 'Danışanların yazmaya başlasın'
          : 'Önce hizmetler: listesi boş bir bot her soruya "hizmet yok" der',
      cta: waConnected || !hasServices ? null : { label: 'Bağla', to: '/sistem?sec=whatsapp' },
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
              {s.blocked && !s.done ? (
                <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>
                  Önceki adımdan sonra
                </div>
              ) : s.cta ? (
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

