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

  const kes = () => {
    setBusy(true);
    setError(null);
    createInvoice({
      payment_ids: [...chosen],
      vat_rate: Number(vat),
      customer: {
        name: secili[0]?.customer_name ?? '',
        phone: secili[0]?.phone ?? '',
      },
    })
      .then((out) => {
        onCreated(out, tahsilToplam);
        setChosen(new Set());
        load();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
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
      <header style={{ padding: '15px 20px', borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>
          Faturalanmamış tahsilatlar
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ink-45)' }}>
          Bu ayki tahsilatlardan seçip tek faturada toplayın — tutarları elle
          yazmanız gerekmez.
        </p>
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
          </span>
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ borderRadius: 8 }}
            disabled={busy}
            onClick={kes}
          >
            {busy ? 'Kesiliyor…' : 'Seçilenlerden fatura kes'}
          </button>
        </footer>
      )}
    </section>
  );
}
