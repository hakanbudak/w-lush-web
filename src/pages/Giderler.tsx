import { useCallback, useEffect, useState } from 'react';
import {
  deleteExpense,
  getExpenseSummary,
  listCategories,
  listExpenses,
  type Expense,
  type ExpenseCategory,
  type ExpenseSummary,
  type PaymentMethod,
} from '../api/expenses';
import ExpenseModal from '../components/ExpenseModal';
import BreakdownBars from '../components/finance/BreakdownBars';
import MonthlyBars from '../components/finance/MonthlyBars';
import PeriodPicker from '../components/finance/PeriodPicker';
import { KpiCard } from '../components/ui';
import { rangeFor, type Period } from '../utils/period';

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

export default function Giderler() {
  const [period, setPeriod] = useState<Period>('ay');
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Satır içi silme onayı: hangi kaydın "Emin misin?" durumunda olduğu.
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(() => {
    const { start, end } = rangeFor(period);
    setError(null);
    Promise.all([getExpenseSummary(start, end), listExpenses(start, end), listCategories()])
      .then(([s, r, c]) => {
        setSummary(s);
        setRows(r);
        setCategories(c);
      })
      .catch(() => setError('Gider verileri yüklenemedi.'));
  }, [period]);

  useEffect(load, [load]);

  const avg = summary && summary.count > 0 ? Math.round(summary.total / summary.count) : 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <PeriodPicker value={period} onChange={setPeriod} />
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ marginLeft: 'auto', borderRadius: 8, fontSize: 12 }}
          onClick={() => setAdding(true)}
        >
          Gider ekle
        </button>
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
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <KpiCard label="Toplam gider" value={fmt(summary.total)} accent="var(--bad)" />
            </div>
            <div style={{ flex: 1 }}>
              <KpiCard label="Kayıt sayısı" value={String(summary.count)} accent="var(--champagne)" />
            </div>
            <div style={{ flex: 1 }}>
              <KpiCard label="Ortalama gider" value={fmt(avg)} accent="var(--sage)" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                flex: 2, background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, padding: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Kategori kırılımı</div>
              <BreakdownBars
                items={summary.by_category.map((c) => ({
                  key: String(c.category_id),
                  label: c.name,
                  amount: c.amount,
                }))}
                total={summary.total}
                empty="Bu dönemde kayıtlı gider yok."
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

          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)',
              borderRadius: 12, padding: 20, marginTop: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Aylık seyir</div>
            <MonthlyBars items={summary.by_month} />
          </div>

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
              Son giderler
            </div>
            {rows?.length === 0 && (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>
                Bu dönemde kayıtlı gider yok.
              </div>
            )}
            {rows?.map((e) => (
              <div
                key={e.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                  borderBottom: '1px solid var(--line)', fontSize: 12,
                }}
              >
                <span style={{ width: 70, color: 'var(--ink-60)' }}>{dayLabel(e.spent_at)}</span>
                <span
                  style={{
                    width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {e.category_name}
                </span>
                <span style={{ flex: 1, minWidth: 0, color: 'var(--ink-60)' }}>
                  {e.description || '—'}
                </span>
                <span style={{ width: 60, color: 'var(--ink-40)' }}>
                  {METHOD_LABEL[e.method] ?? e.method}
                </span>
                <span style={{ width: 90, textAlign: 'right', fontWeight: 600 }}>{fmt(e.amount)}</span>
                {confirmId === e.id ? (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        deleteExpense(e.id)
                          .then(() => {
                            setConfirmId(null);
                            load();
                          })
                          .catch(() => setError('Gider silinemedi.'));
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
                    onClick={() => setConfirmId(e.id)}
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
        <ExpenseModal categories={categories} onClose={() => setAdding(false)} onSaved={load} />
      )}
    </>
  );
}
