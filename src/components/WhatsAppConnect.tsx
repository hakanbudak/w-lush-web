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
      const next = await requestConnection();
      setConn(next);
    } catch (e) {
      const msg = (e as Error).message || '';
      // Uçlar henüz yoksa (404) ham JSON yerine dostça mesaj göster.
      setError(
        /404|not found/i.test(msg)
          ? 'WhatsApp bağlama servisi henüz hazır değil — yakında aktif olacak.'
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

  // — Talep alındı, kuruluyor —
  if (status === 'requested') {
    return (
      <div style={{ ...cardStyle, borderColor: 'var(--champagne)', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: 'var(--champagne-2)', display: 'flex' }}>{Icon.clock}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Bağlantı talebin alındı</div>
            <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 3 }}>
              WhatsApp numaran hazırlanıyor. Hazır olduğunda, bu sayfaya
              döndüğünde burada görünür.
              {conn?.requested_at && ` · Talep: ${fmtDate(conn.requested_at)}`}
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
      </div>
    );
  }

  // — Bağlı değil (none) —
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ color: 'var(--ink-40)', display: 'flex', marginTop: 2 }}>{Icon.whatsapp}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp henüz bağlı değil</div>
          <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 3, lineHeight: 1.5, maxWidth: 480 }}>
            Botun randevu alıp mesajlara yanıt verebilmesi için kliniğine bir WhatsApp Business
            numarası bağlanması gerekiyor. Talep oluştur, numaranı hazırlayıp bağlayalım.
          </div>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 8 }}>{error}</div>
          )}
          <button
            onClick={handleRequest}
            disabled={busy}
            className="wl-btn wl-btn-sm"
            style={{ marginTop: 12, background: 'var(--wa-green)', color: '#fff', borderRadius: 8, fontSize: 12 }}
          >
            {busy ? 'Gönderiliyor…' : 'Bağlantı talebi oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: 16,
  background: 'var(--paper)',
};
