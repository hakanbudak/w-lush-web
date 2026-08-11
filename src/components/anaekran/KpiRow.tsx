
const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

/** Yüzde fark rozeti. Önceki dönem 0 ise oran tanımsızdır, rozet çizilmez. */
function delta(now: number, before: number): { text: string; tone: 'good' | 'bad' } | null {
  if (before <= 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct >= 0 ? '+' : ''}%${Math.abs(pct)}`, tone: pct >= 0 ? 'good' : 'bad' };
}


/**
 * Ana ekrana özel kart: üst kenarda renkli çizgi + delta chip. Paylaşılan
 * `ui.tsx` içindeki KpiCard'a dokunulmuyor — onu başka ekranlar kullanıyor.
 */
function Card({
  label,
  value,
  delta,
  tone,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: 'good' | 'bad';
  accent: string;
}) {
  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderTop: `3px solid ${accent}`,
        borderRadius: 'var(--r-card)',
        padding: '16px 18px',
      }}
    >
      <div className="wl-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {delta && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 999,
              background: tone === 'bad' ? 'var(--bad-soft)' : 'var(--forest-3)',
              color: tone === 'bad' ? 'var(--bad)' : 'var(--forest-2)',
            }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

export interface KpiData {
  todayRevenue: number;
  yesterdayRevenue: number;
  monthRevenue: number;
  prevMonthToDateRevenue: number;
  occupancy: { used: number; capacity: number; percent: number } | null;
  newCustomersThisMonth: number;
}

export default function KpiRow({ data }: { data: KpiData }) {
  const today = delta(data.todayRevenue, data.yesterdayRevenue);
  const month = delta(data.monthRevenue, data.prevMonthToDateRevenue);

  return (
    <div data-tour="kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <Card
        label="Bugün gelir"
        value={money(data.todayRevenue)}
        delta={today?.text}
        tone={today?.tone}
        accent="var(--forest)"
      />
      <Card
        label="Bugün doluluk"
        value={data.occupancy ? `%${data.occupancy.percent}` : '—'}
        delta={data.occupancy ? `${data.occupancy.used}/${data.occupancy.capacity}` : undefined}
        accent="var(--blue)"
      />
      <Card
        label="Bu ay gelir"
        value={money(data.monthRevenue)}
        delta={month?.text}
        tone={month?.tone}
        accent="var(--ai)"
      />
      <Card
        label="Bu ay yeni danışan"
        value={String(data.newCustomersThisMonth)}
        accent="var(--warn)"
      />
    </div>
  );
}
