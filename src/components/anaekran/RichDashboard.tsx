import { useEffect, useState } from 'react';
import { getSettings, listAppointments, type Appointment } from '../../api/clinic';
import { listConversations, type Conversation } from '../../api/conversations';
import { listCustomers } from '../../api/customers';
import { getSummary, listPayments } from '../../api/payments';
import { listStaff } from '../../api/staff';
import {
  compareServices, dailyTotals, dayRange, last30, monthRange, occupancy,
  prev30, prevMonthToDate, type ServiceMove,
} from '../../utils/dashboard';
import DailyRevenueChart from './DailyRevenueChart';
import InboxPanel from './InboxPanel';
import KpiRow, { type KpiData } from './KpiRow';
import TodayAppointments from './TodayAppointments';
import TrendStrip from './TrendStrip';

interface Loaded {
  kpi: KpiData;
  moves: ServiceMove[];
  trendPaymentCount: number;
  appts: Appointment[];
  slots: string[];
  conversations: Conversation[];
  days: { day: string; amount: number }[];
}

export default function RichDashboard() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const today = new Date();
    const t = dayRange(0, today);
    const y = dayRange(1, today);
    const month = monthRange(today);
    const prevMonth = prevMonthToDate(today);
    const c30 = last30(today);
    const p30 = prev30(today);

    Promise.all([
      getSummary(t.start, t.end),
      getSummary(y.start, y.end),
      getSummary(month.start, month.end),
      getSummary(prevMonth.start, prevMonth.end),
      getSummary(c30.start, c30.end),
      getSummary(p30.start, p30.end),
      listAppointments(t.start, t.end),
      getSettings(),
      listStaff(),
      listCustomers(),
      listConversations(),
      listPayments(month.start, month.end),
    ])
      .then(([
        todayS, yestS, monthS, prevMonthS, cur30S, prv30S,
        appts, settings, staff, customers, conversations, monthPayments,
      ]) => {
        const slots = settings.slot_times ?? [];
        const activeStaff = staff.filter((s) => s.active).length;
        const activeAppts = appts.filter((a) => a.status !== 'cancelled').length;
        const monthPrefix = month.start.slice(0, 7);

        setData({
          kpi: {
            todayRevenue: todayS.total,
            yesterdayRevenue: yestS.total,
            monthRevenue: monthS.total,
            prevMonthToDateRevenue: prevMonthS.total,
            occupancy: occupancy(activeAppts, slots.length, activeStaff),
            newCustomersThisMonth: customers.filter(
              (c) => c.first_seen.slice(0, 7) === monthPrefix,
            ).length,
          },
          moves: compareServices(cur30S.by_service, prv30S.by_service),
          trendPaymentCount: cur30S.count,
          appts,
          slots,
          conversations,
          days: dailyTotals(monthPayments, month.start, month.end),
        });
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-40)', fontSize: 13 }}>
        Pano yüklenemedi.
      </div>
    );
  }
  if (data === null) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-40)', fontSize: 13 }}>
        Yükleniyor…
      </div>
    );
  }

  return (
    <>
      <TrendStrip moves={data.moves} paymentCount={data.trendPaymentCount} />
      <KpiRow data={data.kpi} />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <TodayAppointments items={data.appts} slots={data.slots} />
        <InboxPanel items={data.conversations} />
      </div>
      <DailyRevenueChart
        days={data.days}
        monthToDate={data.kpi.monthRevenue}
        prevMonthToDate={data.kpi.prevMonthToDateRevenue}
      />
    </>
  );
}
