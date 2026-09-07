import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createInvoice, deleteInvoice, downloadInvoiceXml, listInvoices,
  type Invoice, type InvoiceLine,
} from '../api/invoices';
import TahsilattanKes from '../components/fatura/TahsilattanKes';
import { getSettings } from '../api/clinic';
import { Icon } from '../components/icons';
import Select from '../components/ui/Select';
import { kurusa, tl, toplamlar } from '../utils/fatura';

type Taslak = {
  name: string;
  quantity: string;
  price: string;
  vat: string;
};

const bosKalem = (): Taslak => ({ name: '', quantity: '1', price: '', vat: '20' });

const KDV = ['0', '1', '10', '20'].map((v) => ({ value: v, label: `%${v}` }));

const PROFIL = [
  { value: 'EARSIVFATURA', label: 'e-Arşiv (bireysel alıcı)' },
  { value: 'TEMELFATURA', label: 'e-Fatura (mükellef alıcı)' },
];

/**
 * Faturalar.
 *
 * Ürün bir entegratöre bağlanmıyor: fatura UBL-TR 1.2 XML olarak
 * üretiliyor ve klinik dosyayı kendi kullandığı yere (GİB portalı ya da
 * entegratörü) kendisi yüklüyor.
 */
export default function Faturalar() {
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acik, setAcik] = useState(false);
  const [busy, setBusy] = useState(false);
  // Fatura toplamı tahsilat toplamından sapabiliyor; farkı gizlemiyoruz.
  const [fark, setFark] = useState<number | null>(null);
  /**
   * Satıcı bilgilerinden eksik olanlar.
   *
   * Sunucu bunları fatura kesilirken denetliyor ve doğrusu bu — eksik
   * bilgiyle üretilen XML'i portal reddeder. Ama hata ancak bütün kalemler
   * yazıldıktan sonra çıkıyordu; operatör formu doldurup gönderiyor ve
   * "önce başka bir ekranı doldur" cevabını alıyordu. Ekran artık bunu
   * baştan söylüyor.
   */
  const [eksik, setEksik] = useState<string[] | null>(null);

  const [lines, setLines] = useState<Taslak[]>([bosKalem()]);
  const [profile, setProfile] = useState('EARSIVFATURA');
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const load = useCallback(() => {
    listInvoices()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    // Alan adları ve etiketleri sunucudaki `SELLER_KEYS` ile aynı; ikisi
    // ayrışırsa panel eksik olmayan bir alanı isteyebilir, o yüzden
    // hata mesajı yine sunucudan geliyor — bu yalnızca önden uyarı.
    const ZORUNLU: [string, string][] = [
      ['invoice_title', 'Ünvan'],
      ['invoice_tax_id', 'VKN / TCKN'],
      ['invoice_tax_office', 'Vergi dairesi'],
      ['invoice_address', 'Adres'],
      ['invoice_city', 'İl'],
      ['invoice_prefix', 'Fatura öneki'],
    ];
    getSettings()
      .then((s) => {
        const rec = s as unknown as Record<string, unknown>;
        setEksik(
          ZORUNLU.filter(([k]) => !String(rec[k] ?? '').trim()).map(([, ad]) => ad),
        );
      })
      // Ayar okunamadıysa uyarı gösterilmiyor: olmayan bir eksiği
      // bildirmektense sunucunun gerçek cevabını beklemek daha doğru.
      .catch(() => setEksik([]));
  }, []);

  const kalemler: InvoiceLine[] = lines
    .filter((l) => l.name.trim())
    .map((l) => ({
      name: l.name.trim(),
      quantity: Math.max(1, Number(l.quantity) || 0),
      unit_price_kurus: kurusa(l.price),
      vat_rate: Number(l.vat) || 0,
    }));

  const ozet = toplamlar(kalemler);

  const kes = () => {
    setBusy(true);
    setError(null);
    createInvoice({
      lines: kalemler,
      customer: {
        name, tax_id: taxId, phone, address, city,
      },
      profile,
    })
      .then((out) => {
        setRows((r) => [out, ...(r ?? [])]);
        setLines([bosKalem()]);
        setName('');
        setTaxId('');
        setPhone('');
        setAddress('');
        setCity('');
        setAcik(false);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const indir = (inv: Invoice) => {
    setError(null);
    downloadInvoiceXml(inv.id, inv.number).catch((e: Error) => setError(e.message));
  };

  const sil = (inv: Invoice) => {
    if (!window.confirm(
      `${inv.number} silinsin mi? Numarası yeniden kullanılmaz.`,
    )) return;
    deleteInvoice(inv.id)
      .then(() => setRows((r) => (r ?? []).filter((x) => x.id !== inv.id)))
      .catch((e: Error) => setError(e.message));
  };

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Faturalar</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-60)' }}>
            Fatura UBL-TR 1.2 biçiminde üretiliyor. Dosyayı indirip kendi
            e-fatura portalınıza yüklersiniz — sistem hiçbir entegratöre
            bağlanmıyor.
          </p>
        </div>
        {!acik && (
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ borderRadius: 8 }}
            disabled={eksik !== null && eksik.length > 0}
            onClick={() => setAcik(true)}
          >
            {Icon.plus}Fatura kes
          </button>
        )}
      </header>

      {eksik !== null && eksik.length > 0 && (
        <div
          style={{
            fontSize: 12.5, background: 'var(--warn-soft)', color: 'var(--warn)',
            borderRadius: 10, padding: '12px 14px', display: 'flex',
            alignItems: 'center', gap: 12, lineHeight: 1.5,
          }}
        >
          <span style={{ flex: 1 }}>
            Fatura kesebilmek için önce satıcı bilgileriniz gerekiyor.{' '}
            <strong>Eksik: {eksik.join(', ')}.</strong> Portal, bunlardan biri
            boşken üretilen faturayı kabul etmiyor.
          </span>
          <Link
            to="/sistem?sec=fatura"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}
          >
            Doldur
          </Link>
        </div>
      )}

      {error && (
        <div
          style={{
            fontSize: 12.5, color: 'var(--bad)', background: 'var(--bad-soft)',
            borderRadius: 10, padding: '10px 14px',
          }}
        >
          {error}
        </div>
      )}

      {fark !== null && (
        <div
          style={{
            fontSize: 12.5, background: 'var(--warn-soft)', color: 'var(--warn)',
            borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 12,
            alignItems: 'center', lineHeight: 1.5,
          }}
        >
          <span style={{ flex: 1 }}>
            Fatura toplamı tahsilat toplamından <strong>{tl(Math.abs(fark))}</strong>{' '}
            {fark > 0 ? 'fazla' : 'eksik'} çıktı. Matrah kuruş hassasiyetinde
            olduğu ve KDV satır başına yuvarlandığı için her tutar tam olarak
            temsil edilemiyor.
          </span>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            onClick={() => setFark(null)}
          >
            Tamam
          </button>
        </div>
      )}

      {/* Bilgiler eksikken bu panel de gizli: seçim yaptırıp sonunda
          reddetmek, "Fatura kes" düğmesini kilitleyip bu yolu açık
          bırakmaktan farksız olurdu. */}
      {!acik && eksik !== null && eksik.length === 0 && (
        <TahsilattanKes
          onCreated={(out, tahsilToplam) => {
            setRows((r) => [out, ...(r ?? [])]);
            setFark(out.total_kurus === tahsilToplam ? null : out.total_kurus - tahsilToplam);
          }}
        />
      )}

      {acik && (
        <section
          style={{
            background: 'var(--paper)', border: '1px solid var(--line-strong)',
            borderRadius: 14, padding: 18, display: 'flex',
            flexDirection: 'column', gap: 16,
          }}
        >
          <div>
            <div className="wl-label" style={{ marginBottom: 8 }}>Alıcı</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input
                className="wl-input"
                value={name}
                placeholder="Ad soyad / ünvan"
                style={{ flex: '1 1 200px' }}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="wl-input wl-mono"
                value={taxId}
                placeholder="TCKN / VKN (isteğe bağlı)"
                style={{ width: 200 }}
                onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ''))}
              />
              <input
                className="wl-input"
                value={phone}
                placeholder="Telefon"
                style={{ width: 150 }}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className="wl-input"
                value={address}
                placeholder="Adres"
                style={{ flex: '1 1 200px' }}
                onChange={(e) => setAddress(e.target.value)}
              />
              <input
                className="wl-input"
                value={city}
                placeholder="İl"
                style={{ width: 130 }}
                onChange={(e) => setCity(e.target.value)}
              />
              <Select
                value={profile}
                onChange={setProfile}
                options={PROFIL}
                ariaLabel="Fatura tipi"
                style={{ width: 220 }}
              />
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-45)', margin: '6px 0 0' }}>
              Bireysel alıcıda kimlik numarası zorunlu değil; boş bırakılırsa
              faturaya hiç yazılmaz.
            </p>
          </div>

          <div>
            <div className="wl-label" style={{ marginBottom: 8 }}>Kalemler</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lines.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="wl-input"
                    value={l.name}
                    placeholder="Hizmet ya da ürün"
                    style={{ flex: 1 }}
                    onChange={(e) =>
                      setLines((r) =>
                        r.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                  <input
                    className="wl-input wl-mono"
                    type="number"
                    min={1}
                    value={l.quantity}
                    aria-label={`${l.name || 'Kalem'} miktarı`}
                    style={{ width: 80, textAlign: 'right' }}
                    onChange={(e) =>
                      setLines((r) =>
                        r.map((x, j) =>
                          j === i ? { ...x, quantity: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    className="wl-input wl-mono"
                    value={l.price}
                    placeholder="0,00"
                    aria-label={`${l.name || 'Kalem'} birim fiyatı`}
                    style={{ width: 120, textAlign: 'right' }}
                    onChange={(e) =>
                      setLines((r) =>
                        r.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)),
                      )
                    }
                  />
                  <Select
                    value={l.vat}
                    onChange={(v) =>
                      setLines((r) => r.map((x, j) => (j === i ? { ...x, vat: v } : x)))
                    }
                    options={KDV}
                    ariaLabel={`${l.name || 'Kalem'} KDV oranı`}
                    style={{ width: 90 }}
                  />
                  <button
                    type="button"
                    aria-label="Kalemi kaldır"
                    disabled={lines.length === 1}
                    onClick={() => setLines((r) => r.filter((_, j) => j !== i))}
                    style={{
                      border: 'none', background: 'transparent', font: 'inherit',
                      fontSize: 15, color: 'var(--ink-45)',
                      cursor: lines.length === 1 ? 'default' : 'pointer',
                      opacity: lines.length === 1 ? 0.3 : 1, padding: '0 4px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ borderRadius: 8, marginTop: 8 }}
              onClick={() => setLines((r) => [...r, bosKalem()])}
            >
              {Icon.plus}Kalem ekle
            </button>
          </div>

          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              borderTop: '1px solid var(--line)', paddingTop: 14,
            }}
          >
            <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-60)' }}>
              Ara toplam <strong className="wl-mono">{tl(ozet.net)}</strong>
              {' · '}KDV <strong className="wl-mono">{tl(ozet.kdv)}</strong>
              {' · '}Toplam <strong className="wl-mono">{tl(ozet.toplam)}</strong>
            </div>
            <button
              type="button"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ borderRadius: 8 }}
              onClick={() => {
                setAcik(false);
                setError(null);
              }}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="wl-btn wl-btn-sm"
              style={{ borderRadius: 8 }}
              disabled={busy || kalemler.length === 0}
              onClick={kes}
            >
              {busy ? 'Kesiliyor…' : 'Faturayı kes'}
            </button>
          </div>
        </section>
      )}

      {rows !== null && rows.length === 0 && !acik && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-45)' }}>
          Henüz fatura yok. Kesmeden önce Sistem → Fatura bilgileri'ni doldurun.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(rows ?? []).map((inv) => (
          <div
            key={inv.id}
            style={{
              background: 'var(--paper)', border: '1px solid var(--line-strong)',
              borderRadius: 12, padding: '13px 16px', display: 'flex',
              alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="wl-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                {inv.number}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-45)', marginTop: 2 }}>
                {inv.issue_date} · {inv.customer_name || 'Nihai Tüketici'}
                {inv.profile === 'TEMELFATURA' && ' · e-Fatura'}
              </div>
            </div>
            <span className="wl-mono" style={{ fontSize: 14, fontWeight: 500 }}>
              {tl(inv.total_kurus)}
            </span>
            <button
              type="button"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ borderRadius: 8 }}
              onClick={() => indir(inv)}
            >
              XML indir
            </button>
            <button
              type="button"
              aria-label={`${inv.number} faturasını sil`}
              onClick={() => sil(inv)}
              style={{
                border: 'none', background: 'transparent', font: 'inherit',
                fontSize: 11, color: 'var(--ink-45)', cursor: 'pointer', padding: 0,
              }}
            >
              sil
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
