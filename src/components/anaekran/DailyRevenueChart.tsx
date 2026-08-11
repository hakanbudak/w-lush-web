const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

const monthTitle = (day: string): string => {
  const [y, m] = day.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
};

/** Günlük bar grafiği. En yüksek gün 120px'e ölçeklenir. */
export default function DailyRevenueChart({
  days,
  monthToDate,
  prevMonthToDate,
}: {
  days: { day: string; amount: number }[];
  monthToDate: number;
  prevMonthToDate: number;
}) {
  const hasAny = days.some((d) => d.amount > 0);
  const max = Math.max(1, ...days.map((d) => d.amount));

  return (
    <div
      style={{
        background: 'var(--paper)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {days.length > 0 ? `${monthTitle(days[0].day)} · gelir` : 'Gelir'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>
            günlük · ayın 1'inden bugüne
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Bugüne kadar</div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {money(monthToDate)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Geçen ay aynı güne kadar</div>
            <div
              style={{
                fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em',
                color: 'var(--ink-60)',
              }}
            >
              {money(prevMonthToDate)}
            </div>
          </div>
        </div>
      </div>

      {!hasAny ? (
        <div style={{ fontSize: 12, color: 'var(--ink-40)', padding: '24px 0' }}>
          Bu ay henüz ödeme kaydı yok.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }}>
            {days.map((d) => (
              <div
                key={d.day}
                title={`${d.day} · ${money(d.amount)}`}
                style={{
                  flex: 1,
                  height: Math.max(2, Math.round((d.amount / max) * 120)),
                  background: d.amount > 0 ? 'var(--forest)' : 'var(--line)',
                  borderRadius: 3,
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 8,
              fontSize: 10, color: 'var(--ink-40)', fontFamily: 'Geist Mono, monospace',
            }}
          >
            <span>{days[0]?.day.slice(-2)}</span>
            <span>{days[days.length - 1]?.day.slice(-2)}</span>
          </div>
        </>
      )}
    </div>
  );
}
