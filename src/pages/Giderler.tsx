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
import KpiTrio from '../components/finance/KpiTrio';
import PeriodPicker from '../components/finance/PeriodPicker';
import { useSetTopBarActions } from '../components/shell/TopBarActions';
import { useToast } from '../components/shell/Toast';
import { getSummary } from '../api/payments';
import { rangeFor, type Period } from '../utils/period';
import { Link } from 'react-router-dom';

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}
    >
      <span style={{ color: 'var(--ink-60)' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function Giderler() {
  const [period, setPeriod] = useState<Period>('ay');
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Satır içi silme onayı: hangi kaydın "Emin misin?" durumunda olduğu.
  const [confirmId, setConfirmId] = useState<number | null>(null);
  // Denge kartı aynı dönemin gelirini de ister; düşerse kart tek başına susar.
  const [income, setIncome] = useState<number | null>(null);

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
    // Ayrı istek: geliri alamamak gider ekranını çalışmaz hâle getirmemeli.
    getSummary(start, end)
      .then((s) => setIncome(s.total))
      .catch(() => setIncome(null));
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
        style={{
          height: 34, borderRadius: 9, fontSize: 12.5, fontWeight: 600,
          background: 'var(--navy)', color: 'var(--navy-ink)',
        }}
        onClick={() => setAdding(true)}
      >
        + Gider ekle
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
            accent="var(--bad)"
            items={[
              {
                label: 'Toplam gider',
                value: fmt(summary.total),
                sub: `${dayLabel(range.start)} – ${dayLabel(range.end)}`,
              },
              { label: 'Kayıt sayısı', value: String(summary.count) },
              { label: 'Ortalama gider', value: fmt(avg) },
            ]}
          />

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
                borderRadius: 'var(--r-card)', padding: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                Gelir–gider dengesi
              </div>
              {income === null ? (
                <div style={{ fontSize: 12, color: 'var(--ink-45)', lineHeight: 1.5 }}>
                  Gelir verisi alınamadı, denge hesaplanamıyor.
                </div>
              ) : (
                <>
                  <Row label="Gelir" value={fmt(income)} />
                  <Row label="Gider" value={fmt(summary.total)} />
                  <div
                    style={{
                      display: 'flex', justifyContent: 'space-between', marginTop: 12,
                      paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span>Net</span>
                    <span
                      style={{
                        color: income - summary.total >= 0 ? 'var(--forest-2)' : 'var(--bad)',
                      }}
                    >
                      {fmt(income - summary.total)}
                    </span>
                  </div>
                  <Link
                    to="/rapor"
                    style={{
                      display: 'inline-block', marginTop: 14, fontSize: 12,
                      color: 'var(--forest)', textDecoration: 'none',
                    }}
                  >
                    AI yorumlu rapor üret →
                  </Link>
                </>
              )}
          </div>
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
                    <span style={{ fontSize: 11, color: 'var(--ink-60)' }}>Emin misiniz?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteExpense(e.id)
                          .then(() => {
                            setConfirmId(null);
                            toast('Gider kaydı silindi.');
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
        <ExpenseModal
          categories={categories}
          onClose={() => setAdding(false)}
          onSaved={() => {
            toast('Gider kaydedildi.');
            load();
          }}
        />
      )}
    </>
  );
}
