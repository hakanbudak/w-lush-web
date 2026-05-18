// w-lush — Modern SaaS Dashboard
// Sol sidebar, sans-serif, sade kartlar. Linear/Stripe/Notion enerjisi.

const NAV = [
  { key: 'home', label: 'Ana ekran', icon: 'home', active: true },
  { key: 'crm', label: 'CRM', icon: 'users', count: 12 },
  { key: 'danisan', label: 'Danışan', icon: 'user' },
  { key: 'randevu', label: 'Randevu', icon: 'calendar' },
  { key: 'gelir', label: 'Gelirler', icon: 'trending' },
  { key: 'gider', label: 'Giderler', icon: 'wallet' },
  { key: 'rapor', label: 'Rapor', icon: 'chart' },
  { key: 'sistem', label: 'Sistem', icon: 'settings' },
];

const NavIcon = {
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  trending: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>,
  wallet: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
  chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>,
  sparkle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>,
  whatsapp: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.73 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01Zm-3.4 8.79c-.18-.09-1.07-.53-1.24-.59-.16-.06-.28-.09-.41.09-.12.18-.47.59-.58.71-.11.12-.21.13-.4.04-.18-.09-.77-.28-1.46-.9-.54-.48-.91-1.08-1.01-1.26-.11-.18-.01-.28.08-.37.08-.08.18-.21.27-.32.09-.11.12-.18.18-.3.06-.12.03-.23-.02-.32-.04-.09-.41-.99-.56-1.36-.15-.36-.3-.31-.41-.31l-.35-.01a.68.68 0 0 0-.49.23c-.17.18-.64.62-.64 1.52 0 .9.66 1.77.75 1.89.09.12 1.3 1.98 3.14 2.78 1.84.8 1.84.53 2.17.5.33-.03 1.07-.44 1.22-.86.15-.42.15-.78.11-.86-.05-.07-.18-.12-.36-.21Z"/></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  trend: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>,
  trendDown: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 7 6 6 4-4 8 8"/><path d="M14 17h7v-7"/></svg>,
  more: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>,
  arrow: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>,
};

function Sidebar() {
  return (
    <aside style={{
      width: 232,
      background: 'var(--paper)',
      borderRight: '1px solid var(--line)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* brand */}
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--forest)', display: 'grid', placeItems: 'center', color: 'var(--cream)', fontWeight: 600, fontSize: 14, letterSpacing: '-0.02em' }}>w</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>w-lush</div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Maslak şubesi</div>
        </div>
      </div>

      {/* nav items */}
      <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((n) => (
          <div key={n.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 8,
            fontSize: 13,
            color: n.active ? 'var(--ink)' : 'var(--ink-60)',
            background: n.active ? 'var(--cream-2)' : 'transparent',
            cursor: 'pointer',
            fontWeight: n.active ? 500 : 400,
          }}>
            <span style={{ color: n.active ? 'var(--forest)' : 'var(--ink-40)' }}>{NavIcon[n.icon]}</span>
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.count && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'var(--cream-3)', color: 'var(--ink-60)', fontFamily: 'Geist Mono, monospace' }}>{n.count}</span>}
          </div>
        ))}
      </nav>

      {/* AI block — pinned */}
      <div style={{ padding: '12px 16px', margin: '16px 12px 0', borderRadius: 10, background: 'linear-gradient(135deg, var(--lavender-soft), var(--champagne-3))', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ color: 'var(--lavender-2)' }}>{NavIcon.sparkle}</span>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lavender-2)' }}>AI Asistan</div>
          <span style={{ marginLeft: 'auto', fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(125,111,163,0.18)', color: 'var(--lavender-2)', fontWeight: 600 }}>YENİ</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--lavender-2)', lineHeight: 1.4 }}>
          “Pınar K.'nın seansını yarına al ve hatırlatma gönder”
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* whatsapp status */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--wa-green)' }}>{NavIcon.whatsapp}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>WhatsApp</div>
          <div style={{ fontSize: 10, color: 'var(--ink-40)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="wl-dot" style={{ background: 'var(--wa-green)' }} /> Bağlı · 12 yeni
          </div>
        </div>
      </div>

      {/* user */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--forest)', color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 500 }}>DA</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>Defne Aydın</div>
          <div style={{ fontSize: 10, color: 'var(--ink-40)' }}>Yönetici</div>
        </div>
        <span style={{ color: 'var(--ink-40)' }}>{NavIcon.more}</span>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 32px', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--ink-40)', letterSpacing: '0.04em' }}>Cumartesi · 16 Mayıs 2026</div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', marginTop: 2 }}>Ana ekran</div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 420, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 14, color: 'var(--ink-40)' }}>{NavIcon.search}</span>
          <input
            placeholder="Danışan, randevu, fatura ara — ya da AI’a sor"
            style={{
              width: '100%', height: 36, padding: '0 56px 0 38px',
              border: '1px solid var(--line-strong)', borderRadius: 8,
              background: 'var(--cream)', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)',
              outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', right: 10, fontSize: 10, fontFamily: 'Geist Mono, monospace', color: 'var(--ink-40)', border: '1px solid var(--line-strong)', padding: '2px 6px', borderRadius: 4, background: 'var(--paper)' }}>⌘K</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }}>
          <span style={{ color: 'var(--wa-green)' }}>{NavIcon.whatsapp}</span>
          Mesaj gönder
        </button>
        <button className="wl-btn wl-btn-sm" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}>
          {NavIcon.plus}Yeni randevu
        </button>
        <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />
        <div style={{ width: 36, height: 36, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--ink-60)', position: 'relative', cursor: 'pointer' }}>
          {NavIcon.bell}
          <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 999, background: 'var(--champagne-2)', border: '2px solid var(--paper)' }} />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta, deltaTone, sparkline, tint, accent }) {
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: accent }} />
        <div style={{ fontSize: 12, color: 'var(--ink-60)', fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: deltaTone === 'good' ? 'var(--sage-2)' : deltaTone === 'warn' ? 'var(--champagne-2)' : 'var(--ink-40)', display: 'flex', alignItems: 'center', gap: 3 }}>
          {deltaTone === 'good' && NavIcon.trend}
          {deltaTone === 'bad' && NavIcon.trendDown}
          {delta}
        </div>
      </div>
      {sparkline && (
        <svg viewBox="0 0 200 32" preserveAspectRatio="none" style={{ width: '100%', height: 32, marginTop: 12, display: 'block' }}>
          <path d={sparkline} fill="none" stroke={accent} strokeWidth="1.4" />
        </svg>
      )}
    </div>
  );
}

function Dashboard({ showAiBanner = true, showRevenueChart = true } = {}) {
  return (
    <div className="wl" style={{ display: 'flex', width: 1440, height: 1024, background: 'var(--cream)' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar />

        <div style={{ flex: 1, padding: 28, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* AI quick banner — trend-aware */}
          {showAiBanner && (
          <div style={{
            background: 'linear-gradient(110deg, var(--paper) 0%, var(--paper) 55%, var(--lavender-soft) 100%)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lavender-soft)', display: 'grid', placeItems: 'center', color: 'var(--lavender-2)', flexShrink: 0 }}>
              {NavIcon.sparkle}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="wl-chip wl-chip-warn" style={{ height: 18, fontSize: 10 }}>Eğilim</span>
                <span><strong>Lazer epilasyon</strong> bu ay <strong style={{ color: 'var(--bad)' }}>−%23</strong>, <strong>cilt bakımı</strong> <strong style={{ color: 'var(--bad)' }}>−%15</strong>. Bir kampanya bu boşluğu kapatabilir.</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>AI son taramayı 4 dk önce yaptı · son 30 gün vs önceki 30 gün · 247 danışan</div>
            </div>
            <button className="wl-btn wl-btn-sm" style={{ background: 'var(--cream-2)', color: 'var(--ink)', borderRadius: 8, fontSize: 12 }}>Kampanyayı gör</button>
            <button className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 8 }}>{NavIcon.sparkle}Tüm öneriler</button>
          </div>
          )}

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <KpiCard
              label="Günlük gelir"
              value="₺ 48.420"
              delta="+12%"
              deltaTone="good"
              accent="var(--forest)"
              sparkline="M0,22 L20,20 L40,18 L60,14 L80,16 L100,10 L120,12 L140,8 L160,10 L180,6 L200,4"
            />
            <KpiCard
              label="Doluluk"
              value="%87"
              delta="14/16"
              deltaTone="good"
              accent="var(--sage)"
              sparkline="M0,20 L25,18 L50,16 L75,12 L100,14 L125,10 L150,8 L175,12 L200,6"
            />
            <KpiCard
              label="Yeni aday"
              value="7"
              delta="+3 bugün"
              deltaTone="good"
              accent="var(--champagne)"
              sparkline="M0,28 L25,24 L50,22 L75,18 L100,20 L125,14 L150,16 L175,10 L200,8"
            />
            <KpiCard
              label="Bekleyen WA"
              value="12"
              delta="AI hazır"
              deltaTone="warn"
              accent="var(--lavender)"
              sparkline="M0,16 L25,18 L50,14 L75,16 L100,12 L125,14 L150,10 L175,12 L200,8"
            />
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 6, fontSize: 12 }}>Liste</button>
                  <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 6, fontSize: 12, background: 'var(--cream-2)' }}>Takvim</button>
                </div>
              </div>
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
                  {[
                    { t: '09:00', n: 'Duygu Özsever', s: 'Hydrafacial · Premium', u: 'Ebru B.', c: 'wa', d: 'Tamamlandı', dt: 'good' },
                    { t: '10:15', n: 'Selin Akın', s: 'Lazer Epilasyon', u: 'Selin K.', c: 'wa', d: 'Devam ediyor', dt: 'forest' },
                    { t: '11:30', n: 'Cem Yıldırım', s: 'Konsültasyon · Botoks', u: 'Dr. Defne', c: 'man', d: 'Onaylı', dt: 'cream' },
                    { t: '13:00', n: 'Aslı Demir', s: 'Mezoterapi + Cilt', u: 'Ebru B.', c: 'wa', d: 'Onaylı', dt: 'cream' },
                    { t: '14:30', n: 'Boş slot', s: 'AI: Berfin Ç. %92 uyum', u: 'Ebru B.', c: 'ai', d: 'Doldur', dt: 'ai', empty: true },
                    { t: '15:45', n: 'Pınar Kaya', s: 'Dolgu · Dudak revizyon', u: 'Dr. Defne', c: 'wa', d: 'Risk %62', dt: 'warn' },
                    { t: '17:00', n: 'Murat Aksoy', s: 'Cilt analizi · İlk seans', u: 'Ebru B.', c: 'web', d: 'Onaylı', dt: 'cream' },
                  ].map((r, i) => (
                    <tr key={i} style={r.empty ? { background: 'var(--lavender-soft)' } : {}}>
                      <td><span className="wl-mono" style={{ fontSize: 12 }}>{r.t}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {!r.empty && (
                            <div style={{ width: 26, height: 26, borderRadius: 999, background: ['var(--forest)','var(--sage)','var(--champagne)','var(--lavender)'][i%4], color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 500 }}>
                              {r.n.split(' ').map(s => s[0]).slice(0,2).join('')}
                            </div>
                          )}
                          {r.empty && <span style={{ color: 'var(--lavender-2)' }}>{NavIcon.sparkle}</span>}
                          <span style={{ fontSize: 13, fontWeight: r.empty ? 400 : 500, color: r.empty ? 'var(--lavender-2)' : 'var(--ink)', fontStyle: r.empty ? 'italic' : 'normal' }}>{r.n}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>{r.s}</td>
                      <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>{r.u}</td>
                      <td>
                        {r.c === 'wa' && <span className="wl-chip wl-chip-wa">{NavIcon.whatsapp}WA</span>}
                        {r.c === 'web' && <span className="wl-chip wl-chip-cream">Web</span>}
                        {r.c === 'man' && <span className="wl-chip wl-chip-cream">Manuel</span>}
                        {r.c === 'ai' && <span className="wl-chip wl-chip-lavender">{NavIcon.sparkle}AI</span>}
                      </td>
                      <td>
                        {r.dt === 'good' && <span className="wl-chip wl-chip-good">{NavIcon.check}{r.d}</span>}
                        {r.dt === 'forest' && <span className="wl-chip" style={{ background: 'var(--cream-3)', color: 'var(--forest-2)' }}><span className="wl-dot" style={{ background: 'var(--forest)' }} />{r.d}</span>}
                        {r.dt === 'cream' && <span className="wl-chip wl-chip-cream">{r.d}</span>}
                        {r.dt === 'warn' && <span className="wl-chip wl-chip-warn">{r.d}</span>}
                        {r.dt === 'ai' && <button className="wl-btn wl-btn-sm" style={{ height: 24, background: 'var(--lavender-2)', color: 'var(--cream)', fontSize: 11, borderRadius: 6 }}>Davet et</button>}
                      </td>
                      <td><span style={{ color: 'var(--ink-40)', cursor: 'pointer' }}>{NavIcon.more}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* AI suggestions list */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--lavender-2)' }}>{NavIcon.sparkle}</span>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>AI önerileri</div>
                  <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--lavender-soft)', color: 'var(--lavender-2)', fontWeight: 600 }}>5</span>
                </div>
                {[
                  {
                    tone: 'warn',
                    tag: 'Eğilim ↓',
                    title: 'Lazer epilasyon −%23 bu ay',
                    sub: 'Yaz kampanyası önerebilirim',
                    cta: 'Kampanya hazırla',
                  },
                  {
                    tone: 'warn',
                    tag: 'Eğilim ↓',
                    title: 'Cilt bakımı son 2 haftada −%15',
                    sub: '18 sadık danışana özel indirim',
                    cta: 'Liste + metin',
                  },
                  {
                    tone: 'sage',
                    tag: 'Fırsat',
                    title: '14:30 slotunu Berfin Ç. doldursun',
                    sub: '%92 uyum · 2 dk önce WA',
                    cta: 'WA gönder',
                  },
                  {
                    tone: 'blush',
                    tag: 'Risk',
                    title: 'Pınar K. iptal riski %62',
                    sub: 'Ön ödeme akışı öner',
                    cta: 'Akış uygula',
                  },
                  {
                    tone: 'lavender',
                    tag: 'Gelir',
                    title: '+₺ 28K paket fırsatı',
                    sub: '12 danışan tekil → pakete uygun',
                    cta: 'Listele',
                  },
                ].map((s, i, arr) => (
                  <div key={i} style={{ padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span className={`wl-chip wl-chip-${s.tone}`} style={{ height: 18, fontSize: 10, padding: '0 6px' }}>{s.tag}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4, marginBottom: 8 }}>{s.sub}</div>
                    <button className="wl-btn wl-btn-sm" style={{ height: 26, background: 'var(--cream-2)', color: 'var(--ink)', fontSize: 11, borderRadius: 6, padding: '0 10px' }}>
                      {s.cta} →
                    </button>
                  </div>
                ))}
              </div>

              {/* WhatsApp inbox preview */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--wa-green)' }}>{NavIcon.whatsapp}</span>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp</div>
                  <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#DCF8C6', color: '#075E54', fontWeight: 600 }}>12 yeni</span>
                </div>
                {[
                  { n: 'Berfin Çağlar', m: 'Cumartesiyi 16:00\'a alabilir miyiz?', t: '2 dk', u: 2, ai: true },
                  { n: '+90 555 312 ••', m: 'Mezoterapi fiyat?', t: '21 dk', u: 1, lead: true, ai: true },
                  { n: 'Ezgi Uçar', m: 'Çarşamba 11:00 uygun mu?', t: '1 sa', u: 1, ai: true },
                  { n: 'Ceren Ö.', m: 'Teşekkürler! 💚', t: '2 sa', u: 0 },
                ].map((m, i, arr) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, background: m.lead ? 'var(--champagne)' : 'var(--cream-3)', color: m.lead ? 'var(--cream)' : 'var(--ink)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 500 }}>
                      {m.n.replace(/[+0-9]/g, '').trim().split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase() || '••'}
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
          {showRevenueChart && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Mayıs · gelir trendi</div>
                <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>1–16 Mayıs · son 16 gün</div>
              </div>
              <div style={{ display: 'flex', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Bugüne kadar</div>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>₺ 612.840</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>AI ay sonu tahmini</div>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--lavender-2)' }}>₺ 1.18M</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Hedef</div>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--sage-2)' }}>₺ 1.10M</div>
                </div>
              </div>
            </div>
            <svg viewBox="0 0 1200 180" preserveAspectRatio="none" style={{ width: '100%', height: 180, display: 'block' }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--forest)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* grid */}
              {[0,1,2,3].map(i => <line key={i} x1="0" x2="1200" y1={40 + i*40} y2={40 + i*40} stroke="var(--line)" strokeWidth="1" />)}
              {/* area */}
              <path d="M0,150 L75,140 L150,135 L225,115 L300,125 L375,100 L450,108 L525,85 L600,95 L675,68 L750,78 L825,52 L900,62 L975,40 L1050,48 L1125,28 L1200,22 L1200,180 L0,180 Z" fill="url(#revGrad)" />
              <path d="M0,150 L75,140 L150,135 L225,115 L300,125 L375,100 L450,108 L525,85 L600,95 L675,68 L750,78 L825,52 L900,62 L975,40 L1050,48 L1125,28 L1200,22" fill="none" stroke="var(--forest)" strokeWidth="2" />
              {/* projection dashed */}
              <path d="M1200,22 L1320,8" fill="none" stroke="var(--lavender-2)" strokeWidth="2" strokeDasharray="4 4" />
              {/* hover point */}
              <circle cx="1125" cy="28" r="4" fill="var(--paper)" stroke="var(--forest)" strokeWidth="2" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-40)', fontFamily: 'Geist Mono, monospace' }}>
              {['1','3','5','7','9','11','13','15','17','19','21','23','25','27','29','31'].map(d => <span key={d}>{d}</span>)}
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
