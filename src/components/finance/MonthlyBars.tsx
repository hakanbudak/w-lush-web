import { monthLabel } from '../../utils/period';

const fmt = (n: number): string => '₺ ' + n.toLocaleString('tr-TR');

/** Aylık bar grafiği. En yüksek ay 96px'e ölçeklenir. */
export default function MonthlyBars({
  items,
}: {
  items: { month: string; amount: number }[];
}) {
  if (items.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Kayıt yok.</div>;
  }
  const max = Math.max(1, ...items.map((m) => m.amount));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
      {items.map((m) => (
        <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              height: Math.max(4, Math.round((m.amount / max) * 96)),
              background: 'var(--forest)', borderRadius: 6, marginBottom: 6,
            }}
            title={fmt(m.amount)}
          />
          <div style={{ fontSize: 10, color: 'var(--ink-40)' }}>{monthLabel(m.month)}</div>
        </div>
      ))}
    </div>
  );
}
