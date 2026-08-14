import { useCallback, useEffect, useState } from 'react';
import {
  deletePayment,
  getSummary,
  listPayments,
  type Payment,
  type PaymentMethod,
  type PaymentSummary,
} from '../api/payments';
import BreakdownBars from '../components/finance/BreakdownBars';
import KpiTrio from '../components/finance/KpiTrio';
import PeriodPicker from '../components/finance/PeriodPicker';
import { useSetTopBarActions } from '../components/shell/TopBarActions';
import { useToast } from '../components/shell/Toast';
import PaymentModal from '../components/PaymentModal';
import { rangeFor, type Period } from '../utils/period';
import { displayName } from '../utils/people';

const fmt = (n: number): string => '₺ ' + n.toLocaleString('tr-TR');

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  card: 'Kart',
  transfer: 'Havale',
  other: 'Diğer',
};

/** YYYY-MM-DD → "12 May" */
const dayLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

/** Yöntem listesindeki renk noktaları — tasarımdaki sırayla. */
const METHOD_COLORS = ['var(--forest)', 'var(--navy)', 'var(--blue)', 'var(--neutral)'];

export default function GelirRaporu() {
  const [period, setPeriod] = useState<Period>('ay');
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Satır içi silme onayı: hangi kaydın "Emin misin?" durumunda olduğu.
  const [confirmId, setConfirmId] = useState<number | null>(null);

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

  const toast = useToast();
  const range = rangeFor(period);

  useSetTopBarActions(
    <>
      <PeriodPicker value={period} onChange={setPeriod} />
      <button
        type="button"
        className="wl-btn wl-btn-sm"
        style={{ height: 34, borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
        onClick={() => setAdding(true)}
      >
        + Gelir ekle
      </button>
    </>,
    [period],
  );

  const avg = summary && summary.count > 0 ? Math.round(summary.total / summary.count) : 0;

  return (
    <>
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
          <KpiTrio
            accent="var(--forest)"
            items={[
              {
                label: 'Toplam gelir',
                value: fmt(summary.total),
                sub: `${dayLabel(range.start)} – ${dayLabel(range.end)}`,
              },
              { label: 'Ödeme sayısı', value: String(summary.count) },
              { label: 'Ortalama ödeme', value: fmt(avg) },
            ]}
          />

          {/* hizmet kırılımı + yöntem dağılımı */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                flex: 2, background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, padding: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Hizmet kırılımı</div>
              <BreakdownBars
                items={summary.by_service.map((s, i) => ({
                  key: s.service_name || `_${i}`,
                  label: s.service_name || 'Belirtilmemiş',
                  amount: s.amount,
                }))}
                total={summary.total}
                empty="Bu dönemde kayıtlı ödeme yok."
              />
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
              {summary.by_method.map((m, i) => (
                <div
                  key={m.method}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: METHOD_COLORS[i % METHOD_COLORS.length],
                    }}
                  />
                  <span style={{ flex: 1 }}>{METHOD_LABEL[m.method] ?? m.method}</span>
                  <span style={{ color: 'var(--ink-60)' }}>{fmt(m.amount)}</span>
                  <span style={{ width: 42, textAlign: 'right', color: 'var(--ink-45)' }}>
                    %{summary.total > 0 ? Math.round((m.amount / summary.total) * 100) : 0}
                  </span>
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
                  {p.phone || p.customer_name
                    ? displayName({ name: p.customer_name, phone: p.phone })
                    : '—'}
                </span>
                <span style={{ flex: 1, minWidth: 0, color: 'var(--ink-60)' }}>
                  {p.service_name || 'Belirtilmemiş'}
                </span>
                <span style={{ width: 60, color: 'var(--ink-40)' }}>
                  {METHOD_LABEL[p.method] ?? p.method}
                </span>
                <span style={{ width: 90, textAlign: 'right', fontWeight: 600 }}>{fmt(p.amount)}</span>
                {confirmId === p.id ? (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-60)' }}>Emin misiniz?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deletePayment(p.id)
                          .then(() => {
                            setConfirmId(null);
                            toast('Ödeme kaydı silindi.');
                            load();
                          })
                          .catch(() => setError('Ödeme silinemedi.'));
                      }}
                      style={{
                        border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                        fontSize: 11, color: 'var(--bad)', cursor: 'pointer',
                      }}
                    >
                      Sil
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      style={{
                        border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                        fontSize: 11, color: 'var(--ink-40)', cursor: 'pointer',
                      }}
                    >
                      Vazgeç
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(p.id)}
                    style={{
                      border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                      fontSize: 11, color: 'var(--ink-40)', cursor: 'pointer',
                    }}
                  >
                    Kaldır
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {adding && (
        <PaymentModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            toast('Gelir kaydedildi.');
            load();
          }}
        />
      )}
    </>
  );
}
