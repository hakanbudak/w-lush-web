import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api/clinic';
import { useAuth } from '../../auth/AuthContext';
import { Toggle } from './ui';

/**
 * Online randevu sayfasının anahtarı ve bağlantısı.
 *
 * Kapalı başlıyor ve burada açılıyor: herkese açık bir yazma ucunu kliniğe
 * haber vermeden açmak, takvimine haberi olmadığı kayıtlar düşmesi demek.
 */
export default function OnlineRandevuSection() {
  const { user } = useAuth();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'kod' | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => setOn(Boolean(s.online_booking)))
      .catch(() => setError('Ayar yüklenemedi.'));
  }, []);

  const slug = user?.clinic.slug ?? '';
  const link = `${window.location.origin}/r/${slug}`;
  const kod = `<iframe src="${link}" style="width:100%;height:760px;border:0" title="Randevu al"></iframe>`;

  const cevir = (next: boolean) => {
    setBusy(true);
    setError(null);
    updateSettings({ online_booking: next })
      .then(() => setOn(next))
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const kopyala = (metin: string, ne: 'link' | 'kod') => {
    navigator.clipboard
      .writeText(metin)
      .then(() => setCopied(ne))
      .catch(() => setError('Kopyalanamadı — metni elle seçebilirsiniz.'));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Online randevu sayfası</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-45)', marginTop: 2 }}>
            Danışanlarınız kendi randevusunu alır. Talepler{' '}
            <strong>onay bekliyor</strong> olarak düşer.
          </div>
        </div>
        <Toggle on={on === true} onClick={() => !busy && on !== null && cevir(!on)} />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 8 }}>{error}</div>
      )}

      {on === false && (
        <p style={{ fontSize: 11.5, color: 'var(--ink-45)', marginTop: 10 }}>
          Kapalıyken sayfa açılmıyor. Açmadan önce hizmetlerinizin ve çalışma
          saatlerinizin güncel olduğundan emin olun — sayfa onları gösteriyor.
        </p>
      )}

      {on === true && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          <Alan
            baslik="Bağlantı"
            aciklama="Instagram profilinize ya da WhatsApp mesajınıza koyabilirsiniz."
            deger={link}
            kopyalandi={copied === 'link'}
            onKopyala={() => kopyala(link, 'link')}
          />
          <Alan
            baslik="Kendi sitenize gömmek için"
            aciklama="Bu kodu sitenizin randevu sayfasına yapıştırın."
            deger={kod}
            kopyalandi={copied === 'kod'}
            onKopyala={() => kopyala(kod, 'kod')}
          />
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8, textDecoration: 'none', alignSelf: 'flex-start' }}
          >
            Sayfayı aç
          </a>
        </div>
      )}
    </div>
  );
}

function Alan({
  baslik, aciklama, deger, kopyalandi, onKopyala,
}: {
  baslik: string;
  aciklama: string;
  deger: string;
  kopyalandi: boolean;
  onKopyala: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{baslik}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-45)', margin: '2px 0 6px' }}>
        {aciklama}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="wl-input wl-mono" readOnly value={deger} style={{ flex: 1 }} />
        <button
          type="button"
          className="wl-btn wl-btn-ghost wl-btn-sm"
          style={{ borderRadius: 8 }}
          onClick={onKopyala}
        >
          {kopyalandi ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
    </div>
  );
}
