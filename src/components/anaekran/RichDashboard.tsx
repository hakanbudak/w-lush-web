import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSettings, listAppointments, type Appointment } from '../../api/clinic';
import { listConversations, type Conversation } from '../../api/conversations';
import { listCustomers } from '../../api/customers';
import { getSummary, listPayments } from '../../api/payments';
import { listStaff } from '../../api/staff';
import {
  compareServices, dailyTotals, dayRange, last30, monthFull, monthRange, occupancy,
  prev30, prevMonthToDate, type ServiceMove,
} from '../../utils/dashboard';
import DailyRevenueChart from './DailyRevenueChart';
import QuickActions from './QuickActions';
import Tour, { type TourStep } from './Tour';
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

const TOUR: TourStep[] = [
  { target: 'nav', place: 'right', title: 'Her şey solda',
    text: 'Randevudan rapora tüm modüller kenar menüde. Rozetler bekleyen işleri gösterir.' },
  { target: 'search', place: 'below', title: 'Tek arama, her kayıt',
    text: 'Danışan, randevu ya da ödeme — ⌘K ile her yerden arayın.' },
  { target: 'actions', place: 'below', title: 'İki tıkta işlem',
    text: 'Yeni randevu oluşturun ya da WhatsApp mesajı gönderin — sayfa değiştirmeden.' },
  { target: 'kpi', place: 'below', title: 'Günün nabzı',
    text: 'Gelir, doluluk ve yeni danışan sayısı her sabah burada sizi karşılar.' },
  { target: 'inbox', place: 'left', title: 'WhatsApp panelde',
    text: '✦ işaretli yanıtları asistan verdi; "Bekliyor" olanlar sizi bekliyor.' },
];

export default function RichDashboard() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const [tourOn, setTourOn] = useState(params.get('tour') === '1');

  const endTour = useCallback(() => {
    setTourOn(false);
    if (params.get('tour')) {
      params.delete('tour');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const load = useCallback(() => {
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
          // Grafik ayın tamamını çiziyor; bugünde kesmek yarım ayı
          // çöküş gibi gösteriyordu.
          days: dailyTotals(monthPayments, monthFull(today).start, monthFull(today).end),
        });
      })
      .catch(() => setError(true));
  }, []);

  useEffect(load, [load]);

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
      <QuickActions
        onCreated={(created) => {
          setNotice(
            created.notified
              ? 'Randevu oluşturuldu, müşteriye WhatsApp bilgisi gönderildi.'
              : 'Randevu oluşturuldu, ancak müşteriye mesaj iletilemedi.',
          );
          load();
        }}
        onSent={(name) => setNotice(`${name} kişisine mesaj gönderildi.`)}
      />

      {notice && (
        <div
          style={{
            background: 'var(--forest-3)',
            color: 'var(--forest-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            padding: '10px 16px',
            fontSize: 12.5,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span style={{ flex: 1 }}>{notice}</span>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            onClick={() => setNotice(null)}
          >
            Tamam
          </button>
        </div>
      )}

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
        today={dayRange(0).start}
      />

      {tourOn && <Tour steps={TOUR} onDone={endTour} />}
    </>
  );
}
