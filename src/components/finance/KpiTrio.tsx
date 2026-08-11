/** Üç KPI kartı — iki finans ekranı da aynı iskeleti kullanıyor. */
export default function KpiTrio({
  accent,
  items,
}: {
  accent: string;
  items: { label: string; value: string; sub?: string }[];
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      {items.map((k) => (
        <div
          key={k.label}
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderTop: `3px solid ${accent}`,
            borderRadius: 'var(--r-card)',
            padding: '16px 18px',
          }}
        >
          <div className="wl-label">{k.label}</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8 }}>
            {k.value}
          </div>
          {k.sub && (
            <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>{k.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
