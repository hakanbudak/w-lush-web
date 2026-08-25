import { useCallback, useEffect, useState } from 'react';
import { listPackages, type Package } from '../../api/clinic';
import {
  cancelCustomerPackage, listCustomerPackages, sellPackage,
  type CustomerPackage,
} from '../../api/packages';
import { trDate } from '../../utils/calendar';
import Select from '../ui/Select';

const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

/** Kalan seansların çubuğu. Bitmiş paket dolu ve soluk görünüyor. */
function Bar({ used, total }: { used: number; total: number }) {
  const oran = total > 0 ? Math.min(1, used / total) : 1;
  return (
    <div
      aria-hidden
      style={{
        height: 5, borderRadius: 999, background: 'var(--line-strong)',
        overflow: 'hidden', marginTop: 6,
      }}
    >
      <div
        style={{
          width: `${oran * 100}%`, height: '100%',
          background: oran >= 1 ? 'var(--ink-20)' : 'var(--forest)',
        }}
      />
    </div>
  );
}

/**
 * Danışanın paketleri.
 *
 * Seans otomatik düşüyor (randevu tamamlanınca), o yüzden burada "seans
 * kullan" düğmesi yok — iki ayrı düşme yolu olsaydı sayacın gerçeği
 * göstermediği durum kaçınılmazdı.
 */
export default function CustomerPackages({
  phone, customerName = '',
}: {
  phone: string;
  customerName?: string;
}) {
  const [sold, setSold] = useState<CustomerPackage[] | null>(null);
  const [catalog, setCatalog] = useState<Package[]>([]);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tahsilat isteğe bağlı: paket taksitle de satılabiliyor.
  const [tahsilat, setTahsilat] = useState(true);
  const [amount, setAmount] = useState('');

  const load = useCallback(() => {
    listCustomerPackages(phone)
      .then(setSold)
      .catch(() => setError('Paketler yüklenemedi.'));
  }, [phone]);

  useEffect(load, [load]);
  useEffect(() => {
    listPackages()
      .then((r) => setCatalog(r.filter((p) => p.active)))
      .catch(() => setCatalog([]));
  }, []);

  const secili = catalog.find((p) => String(p.id) === pick) ?? null;

  // Tutar önerisi paketin fiyatı; operatör indirim yaptıysa değiştiriyor.
  useEffect(() => {
    setAmount(secili && secili.price > 0 ? String(secili.price) : '');
  }, [secili]);

  const sat = () => {
    if (!pick) return;
    const tutar = Number(amount);
    if (tahsilat && (!Number.isFinite(tutar) || tutar <= 0)) {
      setError('Tahsilat tutarı sıfırdan büyük olmalı.');
      return;
    }
    setBusy(true);
    setError(null);
    sellPackage(phone, Number(pick), {
      customerName,
      money: tahsilat ? { amount: tutar, method: 'cash' } : null,
    })
      .then((out) => {
        setSold((s) => [out, ...(s ?? [])]);
        setPick('');
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const iptal = (id: number) => {
    if (!window.confirm('Paket iptal edilsin mi? Kalan seanslar kullanılamaz olur.')) return;
    cancelCustomerPackage(id)
      .then((out) => setSold((s) => (s ?? []).map((p) => (p.id === out.id ? out : p))))
      .catch((e: Error) => setError(e.message));
  };

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Select
          value={pick}
          onChange={setPick}
          options={catalog.map((p) => ({
            value: String(p.id),
            label: `${p.name} · ${p.sessions} seans · ${money(p.price)}`,
          }))}
          placeholder={catalog.length === 0 ? 'Tanımlı paket yok' : 'Paket seçin'}
          disabled={catalog.length === 0}
          ariaLabel="Satılacak paket"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ borderRadius: 8 }}
          disabled={!pick || busy}
          onClick={sat}
        >
          Paket sat
        </button>
      </div>

      {pick && (
        <div
          style={{
            padding: '10px 12px', borderRadius: 10, background: 'var(--cream-2)',
            border: '1px solid var(--line)',
          }}
        >
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={tahsilat}
              onChange={(e) => setTahsilat(e.target.checked)}
            />
            Tahsilatı gelire yaz
          </label>

          {tahsilat && (
            <label
              style={{
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
                fontSize: 11, color: 'var(--ink-60)',
              }}
            >
              Tutar (₺)
              <input
                className="wl-input wl-mono"
                type="number"
                min={1}
                value={amount}
                style={{ width: 130, textAlign: 'right' }}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          )}

          <p style={{ fontSize: 11, color: 'var(--ink-45)', margin: '8px 0 0' }}>
            {tahsilat
              ? 'Paket ve tahsilat tek işlemde yazılıyor; biri olup diğeri olmuyor.'
              : 'Kapalıyken paket satılır ama gelir raporuna girmez — taksitli satışta tahsilatı ayrıca girersiniz.'}
          </p>
        </div>
      )}

      {catalog.length === 0 && (
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-45)' }}>
          Önce Sistem ekranından paket tanımlayın. Paketi bir hizmete
          bağlarsanız o hizmetin randevusu tamamlandığında seans kendiliğinden
          düşer.
        </p>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

      {sold !== null && sold.length === 0 && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-45)' }}>
          Bu danışana henüz paket satılmamış.
        </p>
      )}

      {(sold ?? []).map((p) => (
        <div
          key={p.id}
          style={{
            border: '1px solid var(--line-strong)', borderRadius: 10,
            padding: '12px 14px', opacity: p.cancelled ? 0.55 : 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
            <span className="wl-mono" style={{ fontSize: 12.5 }}>
              {p.cancelled ? 'İptal' : `${p.remaining} / ${p.total_sessions} seans`}
            </span>
            {!p.cancelled && (
              <button
                type="button"
                onClick={() => iptal(p.id)}
                style={{
                  border: 'none', background: 'transparent', font: 'inherit',
                  fontSize: 11, color: 'var(--ink-45)', cursor: 'pointer', padding: 0,
                }}
              >
                iptal et
              </button>
            )}
          </div>

          <Bar used={p.used_sessions} total={p.total_sessions} />

          <div style={{ fontSize: 11.5, color: 'var(--ink-45)', marginTop: 8 }}>
            {p.service_name || 'Hizmete bağlı değil — seans otomatik düşmez'}
            {' · '}
            {money(p.price)}
            {' · '}
            {trDate(p.sold_on)} tarihinde satıldı
            {p.payment_id === null && !p.cancelled && (
              <span style={{ color: 'var(--warn)' }}> · tahsilat girilmedi</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
