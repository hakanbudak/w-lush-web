import { useCallback, useEffect, useState } from 'react';
import {
  getSummary,
  listPayments,
  type Payment,
  type PaymentMethod,
  type PaymentSummary,
} from '../api/payments';
import { KpiCard } from '../components/ui';
import { monthLabel, rangeFor, type Period } from '../utils/period';

const fmt = (n: number): string => '₺ ' + n.toLocaleString('tr-TR');

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  card: 'Kart',
  transfer: 'Havale',
  other: 'Diğer',
};

const BAR_COLORS = [
  'var(--champagne)',
  'var(--forest)',
  'var(--lavender)',
  'var(--sage)',
  'var(--ink-40)',
];

/** YYYY-MM-DD → "12 May" */
const dayLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

export default function GelirRaporu() {
  const [period, setPeriod] = useState<Period>('ay');
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const { start, end } = rangeFor(period);
    setError(null);
    Promise.all([getSummary(start, end), listPayments(start, end)])
      .then(([s, r]) => {
        setSummary(s);
        setRows(r);
      })
      .catch(() => setError('Gelir verileri yüklenemedi.'));
  }, [period]);

  useEffect(load, [load]);

  const avg = summary && summary.count > 0 ? Math.round(summary.total / summary.count) : 0;
  const maxMonth = summary ? Math.max(1, ...summary.by_month.map((m) => m.amount)) : 1;

  return (
    <>
      {/* dönem seçici */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex', background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: 8, padding: 3,
          }}
        >
          {([['ay', 'Bu ay'], ['ceyrek', 'Çeyrek'], ['yil', 'Yıl']] as [Period, string][]).map(
            ([k, lbl]) => (
              <button
                key={k}
                onClick={() => setPeriod(k)}
                className="wl-btn wl-btn-sm"
                style={{
                  height: 28, borderRadius: 6, fontSize: 12,
                  background: period === k ? 'var(--cream-2)' : 'transparent',
                  color: period === k ? 'var(--ink)' : 'var(--ink-60)',
                }}
              >
                {lbl}
              </button>
            ),
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-60)' }}>
          {error}{' '}
          <button
            type="button"
            onClick={load}
            style={{
              border: 'none', background: 'transparent', padding: 0, font: 'inherit',
              fontSize: 13, color: 'var(--forest)', cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Tekrar dene
          </button>
        </div>
      )}

      {!error && summary === null && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-40)' }}>Yükleniyor…</div>
      )}

      {!error && summary && (
        <>
          {/* KPI satırı */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <KpiCard label="Toplam gelir" value={fmt(summary.total)} accent="var(--forest)" />
            </div>
            <div style={{ flex: 1 }}>
              <KpiCard label="Ödeme sayısı" value={String(summary.count)} accent="var(--champagne)" />
            </div>
            <div style={{ flex: 1 }}>
              <KpiCard label="Ortalama ödeme" value={fmt(avg)} accent="var(--sage)" />
            </div>
          </div>

          {/* hizmet kırılımı + yöntem dağılımı */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                flex: 2, background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, padding: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Hizmet kırılımı</div>
              {summary.by_service.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>
                  Bu dönemde kayıtlı ödeme yok.
                </div>
              )}
              {summary.by_service.map((s, i) => {
                const pct = summary.total > 0 ? Math.round((s.amount / summary.total) * 100) : 0;
                return (
                  <div key={s.service_name || `_${i}`} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: 12, marginBottom: 6,
                      }}
                    >
                      <span>{s.service_name || 'Belirtilmemiş'}</span>
                      <span style={{ color: 'var(--ink-60)' }}>
                        {fmt(s.amount)} · %{pct}
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--cream)', borderRadius: 999 }}>
                      <div
                        style={{
                          width: `${pct}%`, height: '100%', borderRadius: 999,
                          background: BAR_COLORS[i % BAR_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                flex: 1, background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, padding: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Ödeme yöntemi</div>
              {summary.by_method.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Kayıt yok.</div>
              )}
              {summary.by_method.map((m) => (
                <div
                  key={m.method}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, marginBottom: 10,
                  }}
                >
                  <span>{METHOD_LABEL[m.method] ?? m.method}</span>
                  <span style={{ color: 'var(--ink-60)' }}>{fmt(m.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* aylık seyir */}
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)',
              borderRadius: 12, padding: 20, marginTop: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Aylık seyir</div>
            {summary.by_month.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Kayıt yok.</div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
              {summary.by_month.map((m) => (
                <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      height: Math.max(4, Math.round((m.amount / maxMonth) * 96)),
                      background: 'var(--forest)', borderRadius: 6, marginBottom: 6,
                    }}
                    title={fmt(m.amount)}
                  />
                  <div style={{ fontSize: 10, color: 'var(--ink-40)' }}>{monthLabel(m.month)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* son ödemeler */}
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)',
              borderRadius: 12, marginTop: 12, overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px', borderBottom: '1px solid var(--line)',
                fontSize: 14, fontWeight: 600,
              }}
            >
              Son ödemeler
            </div>
            {rows?.length === 0 && (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>
                Bu dönemde kayıtlı ödeme yok.
              </div>
            )}
            {rows?.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                  borderBottom: '1px solid var(--line)', fontSize: 12,
                }}
              >
                <span style={{ width: 70, color: 'var(--ink-60)' }}>{dayLabel(p.paid_at)}</span>
                <span
                  style={{
                    width: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {p.customer_name || p.phone || '—'}
                </span>
                <span style={{ flex: 1, minWidth: 0, color: 'var(--ink-60)' }}>
                  {p.service_name || 'Belirtilmemiş'}
                </span>
                <span style={{ width: 60, color: 'var(--ink-40)' }}>
                  {METHOD_LABEL[p.method] ?? p.method}
                </span>
                <span style={{ width: 90, textAlign: 'right', fontWeight: 600 }}>{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
