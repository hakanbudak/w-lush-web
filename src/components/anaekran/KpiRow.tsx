import { KpiCard } from '../ui';

const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

/** Yüzde fark rozeti. Önceki dönem 0 ise oran tanımsızdır, rozet çizilmez. */
function delta(now: number, before: number): { text: string; tone: 'good' | 'bad' } | null {
  if (before <= 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct >= 0 ? '+' : ''}%${Math.abs(pct)}`, tone: pct >= 0 ? 'good' : 'bad' };
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <KpiCard
        label="Bugün gelir"
        value={money(data.todayRevenue)}
        delta={today?.text}
        deltaTone={today?.tone}
        accent="var(--forest)"
      />
      <KpiCard
        label="Bugün doluluk"
        value={data.occupancy ? `%${data.occupancy.percent}` : '—'}
        delta={data.occupancy ? `${data.occupancy.used}/${data.occupancy.capacity}` : undefined}
        accent="var(--sage)"
      />
      <KpiCard
        label="Bu ay gelir"
        value={money(data.monthRevenue)}
        delta={month?.text}
        deltaTone={month?.tone}
        accent="var(--champagne)"
      />
      <KpiCard
        label="Bu ay yeni danışan"
        value={String(data.newCustomersThisMonth)}
        accent="var(--lavender)"
      />
    </div>
  );
}
