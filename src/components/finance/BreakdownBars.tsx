const COLORS = [
  'var(--champagne)',
  'var(--forest)',
  'var(--lavender)',
  'var(--sage)',
  'var(--ink-40)',
];

const fmt = (n: number): string => '₺ ' + n.toLocaleString('tr-TR');

export interface BreakdownItem {
  key: string;
  label: string;
  amount: number;
}

/**
 * Yüzdeli bar listesi. Yüzdeler `total`e göre hesaplanır; toplam 0 ise barlar
 * boş kalır (sıfıra bölme yok).
 */
export default function BreakdownBars({
  items,
  total,
  empty,
}: {
  items: BreakdownItem[];
  total: number;
  empty: string;
}) {
  if (items.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{empty}</div>;
  }
  return (
    <>
      {items.map((item, i) => {
        const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
        return (
          <div key={item.key} style={{ marginBottom: 14 }}>
            <div
              style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, marginBottom: 6,
              }}
            >
              <span>{item.label}</span>
              <span style={{ color: 'var(--ink-60)' }}>
                {fmt(item.amount)} · %{pct}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--cream)', borderRadius: 999 }}>
              <div
                style={{
                  width: `${pct}%`, height: '100%', borderRadius: 999,
                  background: COLORS[i % COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
