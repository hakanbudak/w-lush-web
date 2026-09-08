import { useCallback, useEffect, useState } from 'react';
import {
  createInvoice, listUninvoicedPayments,
  type InvoiceDetail, type UninvoicedPayment,
} from '../../api/invoices';
import { monthRange } from '../../utils/dashboard';
import { tl } from '../../utils/fatura';
import Select from '../ui/Select';

const KDV = ['0', '1', '10', '20'].map((v) => ({ value: v, label: `%${v}` }));

/**
 * Faturalanmamış tahsilatlardan fatura kesme.
 *
 * Tahsilat tutarı danışanın ödediği, yani **KDV dahil** tutar; sunucu onu
 * matraha çeviriyor. Matrah kuruş hassasiyetinde olduğu ve KDV satır başına
 * yuvarlandığı için her tutar tam temsil edilemiyor — fatura toplamı
 * tahsilat toplamından bir kuruş sapabiliyor.
 */
export default function TahsilattanKes({
  onCreated,
}: {
  onCreated: (invoice: InvoiceDetail, tahsilToplamKurus: number) => void;
}) {
  const [rows, setRows] = useState<UninvoicedPayment[] | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [vat, setVat] = useState('20');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const r = monthRange();
    listUninvoicedPayments(r.start, r.end)
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const secili = (rows ?? []).filter((p) => chosen.has(p.id));
  const tahsilToplam = secili.reduce((s, p) => s + p.amount, 0) * 100;

  /**
   * Seçilenleri danışana göre ayırır.
   *
   * Bir fatura tek alıcıya kesiliyor: farklı danışanların tahsilatını aynı
   * belgeye koymak, birinin faturasına başkasının hizmetini yazmak ve o
   * kişinin ne aldığını üçüncü birine göstermek olurdu. Aynı kişinin iki
   * tahsilatı ise tek faturada toplanabiliyor.
   */
  const gruplar = (): UninvoicedPayment[][] => {
    const harita = new Map<string, UninvoicedPayment[]>();
    for (const p of secili) {
      const anahtar = `${p.phone ?? ''}|${p.customer_name}`;
      harita.set(anahtar, [...(harita.get(anahtar) ?? []), p]);
    }
    return [...harita.values()];
  };

  const kisiSayisi = gruplar().length;

  const kes = async () => {
    setBusy(true);
    setError(null);
    const kume = gruplar();
    const kesilen: string[] = [];
    try {
      // Sırayla: fatura numarası sayacı tek ve eşzamanlı istekler
      // çakışabiliyor.
      for (const grup of kume) {
        const out = await createInvoice({
          payment_ids: grup.map((p) => p.id),
          vat_rate: Number(vat),
          customer: {
            name: grup[0].customer_name,
            phone: grup[0].phone ?? '',
          },
        });
        kesilen.push(out.number);
        onCreated(out, grup.reduce((s, p) => s + p.amount, 0) * 100);
      }
      setChosen(new Set());
    } catch (e) {
      // Bir kısmı kesilmiş olabilir; kaçının kesildiğini söylemek şart,
      // yoksa operatör hepsini yeniden dener ve mükerrer fatura çıkar.
      const kalan = kume.length - kesilen.length;
      setError(
        kesilen.length === 0
          ? (e as Error).message
          : `${kesilen.length} fatura kesildi (${kesilen.join(', ')}), `
            + `${kalan} tanesi kesilemedi: ${(e as Error).message}`,
      );
    } finally {
      setBusy(false);
      load();
    }
  };

  const cevir = (id: number) =>
    setChosen((c) => {
      const next = new Set(c);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section
      style={{
        background: 'var(--paper)', border: '1px solid var(--line-strong)',
        borderRadius: 14, overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '15px 20px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>
            Faturalanmamış tahsilatlar
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ink-45)' }}>
            Seçtiklerinizin faturası <strong>danışan başına ayrı</strong>
            kesilir; tutarları elle yazmanız gerekmez.
          </p>
        </div>
        {(rows ?? []).length > 0 && (
          <button
            type="button"
            onClick={() =>
              setChosen((c) =>
                c.size === (rows ?? []).length
                  ? new Set()
                  : new Set((rows ?? []).map((p) => p.id)),
              )
            }
            style={{
              border: 'none', background: 'transparent', font: 'inherit',
              fontSize: 11.5, color: 'var(--ink-45)', cursor: 'pointer',
              padding: 0, flexShrink: 0,
            }}
          >
            {chosen.size === (rows ?? []).length ? 'Seçimi kaldır' : 'Hepsini seç'}
          </button>
        )}
      </header>

      {error && (
        <p style={{ padding: '14px 20px', margin: 0, fontSize: 12.5, color: 'var(--bad)' }}>
          {error}
        </p>
      )}

      {rows !== null && rows.length === 0 && (
        <p style={{ padding: 20, margin: 0, fontSize: 12.5, color: 'var(--ink-45)' }}>
          Bu ay faturalanmamış tahsilat yok.
        </p>
      )}

      {(rows ?? []).map((p, i) => (
        <label
          key={p.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
            borderTop: i === 0 ? 'none' : '1px solid var(--line)',
            fontSize: 12.5, cursor: 'pointer',
            background: chosen.has(p.id) ? 'var(--cream-2)' : 'transparent',
          }}
        >
          <input
            type="checkbox"
            checked={chosen.has(p.id)}
            onChange={() => cevir(p.id)}
            aria-label={`${p.service_name || 'Tahsilat'} · ${p.paid_at}`}
          />
          <span className="wl-mono" style={{ color: 'var(--ink-45)', minWidth: 82 }}>
            {p.paid_at}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            {p.service_name || 'Hizmet bedeli'}
            {p.customer_name && (
              <span style={{ color: 'var(--ink-45)' }}> · {p.customer_name}</span>
            )}
          </span>
          <span className="wl-mono">{tl(p.amount * 100)}</span>
        </label>
      ))}

      {chosen.size > 0 && (
        <footer
          style={{
            padding: '13px 20px', borderTop: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}
        >
          <label
            style={{
              fontSize: 11, color: 'var(--ink-60)', display: 'flex',
              alignItems: 'center', gap: 6,
            }}
          >
            KDV
            <Select
              value={vat}
              onChange={setVat}
              options={KDV}
              ariaLabel="KDV oranı"
              style={{ width: 90 }}
            />
          </label>
          <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-60)' }}>
            {chosen.size} tahsilat ·{' '}
            <strong className="wl-mono">{tl(tahsilToplam)}</strong>
            {kisiSayisi > 1 && (
              <span style={{ color: 'var(--ink-45)' }}>
                {' '}· {kisiSayisi} danışan, {kisiSayisi} ayrı fatura
              </span>
            )}
          </span>
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ borderRadius: 8 }}
            disabled={busy}
            onClick={kes}
          >
            {busy
              ? 'Kesiliyor…'
              : kisiSayisi > 1
                ? `${kisiSayisi} fatura kes`
                : 'Fatura kes'}
          </button>
        </footer>
      )}
    </section>
  );
}
