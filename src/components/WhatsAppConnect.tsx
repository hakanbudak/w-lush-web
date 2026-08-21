// WhatsApp bağlantı kartı (Model A): durum gösterir + talep oluşturur.
// none → "talep oluştur" · requested → "kuruluyor" · connected → "✓ bağlı".
// Durum bir kliniğin ömründe bir kez değişir → sürekli polling yerine
// sekme odağa dönünce + "Yenile" butonuyla tazelenir.
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Icon } from './icons';
import { getConnection, requestConnection, type WaConnection } from '../api/whatsapp';

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function WhatsAppConnect() {
  const [conn, setConn] = useState<WaConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState('');
  const [inUse, setInUse] = useState<boolean | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const next = await getConnection();
    setConn(next);
    return next;
  }, []);

  // İlk yükleme
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Sekme/pencere odağa dönünce tazele (yönetici numarayı atamış olabilir).
  // Sürekli polling yok — yalnızca kullanıcı geri döndüğünde bir istek.
  useEffect(() => {
    function onFocus() {
      if (document.visibilityState === 'visible') load();
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRequest() {
    setBusy(true);
    setError(null);
    try {
      setConn(
        await requestConnection({
          desired_number: number.trim(),
          note: note.trim(),
          number_in_use: inUse,
        }),
      );
    } catch (e) {
      const msg = (e as Error).message;
      setError(
        msg.includes('401')
          ? 'Oturumun sonlanmış olabilir, tekrar giriş yap.'
          : msg || 'Talep gönderilemedi, lütfen tekrar deneyin.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 13, color: 'var(--ink-40)' }}>Yükleniyor…</div>
      </div>
    );
  }

  const status = conn?.status ?? 'none';

  // — Bağlı —
  if (status === 'connected') {
    return (
      <div style={{ ...cardStyle, borderColor: 'var(--wa-green)', background: '#F2FBF4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              WhatsApp bağlı
              <span className="wl-chip wl-chip-good" style={{ height: 18, fontSize: 10 }}>{Icon.check}Aktif</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 3 }}>
              {conn?.display_number || 'Numara'} · botun mesajları bu kliniğe yönlendiriyor
              {conn?.connected_at && ` · ${fmtDate(conn.connected_at)}`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // — Talep alındı: sırada ne olduğunu söyle —
  //
  // Eskiden yalnızca "hazırlanıyor" yazıyordu; klinik kendisinden ne
  // isteneceğini bilmeden bekliyordu. Doğrulama adımı iki tarafın aynı anda
  // müsait olmasını gerektirdiği için bunu önceden söylemek zorundayız.
  if (status === 'requested') {
    const adimlar = [
      {
        baslik: 'Talebini aldık',
        alt: conn?.requested_at ? fmtDate(conn.requested_at) : '',
        bitti: true,
      },
      {
        baslik: 'Numaranı Meta tarafında ekliyoruz',
        alt: 'Görünen ad kliniğinin adını içermeli; Meta bunu inceliyor.',
        bitti: false,
      },
      {
        baslik: 'Doğrulama kodu senin telefonuna gelecek',
        alt: 'Seninle iletişime geçip birlikte yapacağız — kodun birkaç dakika içinde iletilmesi gerekiyor.',
        bitti: false,
      },
      {
        baslik: 'Bot yayına giriyor',
        alt: 'Bu kart "bağlı" olur ve danışanların yazmaya başlayabilir.',
        bitti: false,
      },
    ];

    return (
      <div style={{ ...cardStyle, borderColor: 'var(--champagne)', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: 'var(--champagne-2)', display: 'flex' }}>{Icon.clock}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Bağlantı talebin alındı</div>
            <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 3 }}>
              {conn?.display_number
                ? `Numara: ${conn.display_number}`
                : 'Numara verilmedi — aşağıdan ekleyebilirsin.'}
              {conn?.note ? ` · Müsaitlik: ${conn.note}` : ''}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="wl-btn wl-btn-sm"
            style={{ fontSize: 12, borderRadius: 8 }}
          >
            {refreshing ? 'Yenileniyor…' : 'Yenile'}
          </button>
          <span className="wl-chip wl-chip-warn" style={{ height: 20, fontSize: 11 }}>Bekliyor</span>
        </div>

        <ol style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {adimlar.map((a, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span
                style={{
                  width: 18, height: 18, borderRadius: 999, flexShrink: 0, marginTop: 1,
                  display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
                  background: a.bitti ? 'var(--sage)' : 'var(--cream-2)',
                  color: a.bitti ? 'var(--cream)' : 'var(--ink-60)',
                }}
              >
                {a.bitti ? '✓' : i + 1}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 500 }}>{a.baslik}</span>
                {a.alt && (
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-60)', lineHeight: 1.5 }}>
                    {a.alt}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>

        {conn?.number_in_use === true && (
          <div
            style={{
              marginTop: 12, background: 'var(--warn-soft)', borderRadius: 8,
              padding: '10px 12px', fontSize: 11.5, lineHeight: 1.6,
            }}
          >
            <strong style={{ color: 'var(--warn)' }}>Senin tarafında bir hazırlık var:</strong>{' '}
            verdiğin numara WhatsApp'ta kullanılıyor. Bağlayabilmemiz için o hesabın silinmesi
            gerekiyor; sohbet geçmişi kaybolacağı için bunu sana haber vermeden yapmıyoruz.
          </div>
        )}
      </div>
    );
  }

  // — Bağlı değil (none): talep bir form —
  //
  // Eskiden boş bir düğmeydi: klinik basıyor, "istek gönderildi" görüyor ve
  // orada kalıyordu. Numarayı ekleyecek kişinin ise üç şeye ihtiyacı var —
  // hangi numara, o numara WhatsApp'ta kullanılıyor mu, ve klinik doğrulama
  // kodu için ne zaman müsait.
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ color: 'var(--ink-40)', display: 'flex', marginTop: 2 }}>{Icon.whatsapp}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp henüz bağlı değil</div>
          <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 3, lineHeight: 1.55, maxWidth: 520 }}>
            Botun randevu alabilmesi için kliniğine bir WhatsApp numarası bağlanması
            gerekiyor. Aşağıdakileri doldur; numarayı biz Meta tarafında ekleyip
            sana döneceğiz.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14, maxWidth: 520 }}>
            <label style={labelStyle}>
              Bağlanacak numara
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+90 5xx xxx xx xx"
                inputMode="tel"
                style={fieldStyle}
              />
            </label>

            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>
                Bu numara şu an WhatsApp'ta kullanılıyor mu?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { v: true, l: 'Evet, kullanılıyor' },
                  { v: false, l: 'Hayır' },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setInUse(o.v)}
                    aria-pressed={inUse === o.v}
                    className={inUse === o.v ? 'wl-btn wl-btn-primary wl-btn-sm' : 'wl-btn wl-btn-sm'}
                    style={{ borderRadius: 8 }}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              {inUse === true && (
                <div
                  style={{
                    marginTop: 8, background: 'var(--warn-soft)', color: 'var(--ink)',
                    borderRadius: 8, padding: '10px 12px', fontSize: 11.5, lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: 'var(--warn)' }}>Bunu bilerek başlayalım:</strong> bir
                  numara WhatsApp'ta ya da WhatsApp Business uygulamasında aktifken bağlanamıyor.
                  Bağlamadan önce o hesabın silinmesi gerekiyor —{' '}
                  <strong>o numaradaki sohbet geçmişi kaybolur</strong> ve numara uygulamada
                  çalışmayı bırakır. Kullanmadığın ikinci bir numaran varsa daha kolay olur.
                </div>
              )}
            </div>

            <label style={labelStyle}>
              Doğrulama için ne zaman müsaitsin?
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Örn. hafta içi 14:00–17:00"
                style={fieldStyle}
              />
              <span style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4, display: 'block', lineHeight: 1.5 }}>
                Meta doğrulama kodunu <strong>senin telefonuna</strong> gönderiyor ve kodun
                birkaç dakika içinde bize iletilmesi gerekiyor. Yani bu adımı birlikte,
                telefon başındayken yapıyoruz.
              </span>
            </label>
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 10 }}>{error}</div>}

          <button
            onClick={handleRequest}
            disabled={busy || !number.trim() || inUse === null}
            className="wl-btn wl-btn-sm"
            style={{
              marginTop: 14, background: 'var(--wa-green)', color: '#fff',
              borderColor: 'var(--wa-green)', borderRadius: 8, fontSize: 12,
            }}
          >
            {busy ? 'Gönderiliyor…' : 'Bağlantı talebi gönder'}
          </button>
          {(!number.trim() || inUse === null) && (
            <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 6 }}>
              Numara ve WhatsApp durumu olmadan talep işimize yaramıyor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-60)',
  display: 'block',
  fontWeight: 500,
};

const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '8px 10px',
  font: 'inherit',
  fontSize: 13,
  background: 'var(--cream)',
  marginTop: 5,
};

const cardStyle: CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: 16,
  background: 'var(--paper)',
};
