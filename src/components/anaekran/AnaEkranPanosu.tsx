import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getSettings, listAppointments, listServices, type Appointment,
} from '../../api/clinic';
import { listConversations } from '../../api/conversations';
import { listCustomers } from '../../api/customers';
import { getSummary, listPayments } from '../../api/payments';
import { listStaff } from '../../api/staff';
import { getConnection } from '../../api/whatsapp';
import { bosSlotSayisi, yaklasanlar } from '../../utils/akis';
import {
  dailyTotals, dayRange, monthFull, monthRange, occupancy, prevMonthToDate,
} from '../../utils/dashboard';
import { gorevler, type Gorev } from '../../utils/gorevler';
import {
  gunSatiri, ozetSatiri, randevuBildirimi, selamlama, type RandevuBildirimi,
} from '../../utils/karsilama';
import BekleyenIsler from './BekleyenIsler';
import BugunPanel, { type BugunVerisi } from './BugunPanel';
import DailyRevenueChart from './DailyRevenueChart';
import GununAkisi from './GununAkisi';
import NasilCalisir from './NasilCalisir';
import QuickActions from './QuickActions';
import Tour, { type TourStep } from './Tour';

interface Loaded {
  bugun: BugunVerisi;
  gorevListesi: Gorev[];
  appts: Appointment[];
  upcoming: Appointment[];
  slots: string[];
  monthRevenue: number;
  prevMonthToDateRevenue: number;
  waConnected: boolean;
  days: { day: string; amount: number }[];
}

const TOUR: TourStep[] = [
  { target: 'nav', place: 'right', title: 'Her şey solda',
    text: 'Randevudan rapora tüm modüller kenar menüde. Rozetler bekleyen işleri gösterir.' },
  { target: 'search', place: 'below', title: 'Tek arama, her kayıt',
    text: 'Danışan, randevu ya da ödeme — ⌘K ile her yerden arayın.' },
  { target: 'actions', place: 'below', title: 'İki tıkta işlem',
    text: 'Yeni randevu oluşturun ya da WhatsApp mesajı gönderin — sayfa değiştirmeden.' },
  { target: 'akis', place: 'right', title: 'Günün akışı',
    text: 'Çalışma saatlerin baştan sona. Boş bir satıra tıklayınca randevu formu o saatle açılır.' },
  { target: 'isler', place: 'left', title: 'Bekleyen işler',
    text: 'Kurulum eksikleri ve yanıt bekleyen mesajlar tek listede toplanır.' },
];

export default function AnaEkranPanosu() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<RandevuBildirimi | null>(null);
  const [openAt, setOpenAt] = useState<string | null>(null);
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
    const month = monthRange(today);
    const prevMonth = prevMonthToDate(today);

    Promise.all([
      getSummary(t.start, t.end),
      getSummary(month.start, month.end),
      getSummary(prevMonth.start, prevMonth.end),
      listAppointments(t.start, t.end),
      // Yaklaşanlar için ayrı çağrı: bugünü boş gören ekran sıradakini de söylesin.
      listAppointments(t.start, monthFull(today).end),
      getSettings(),
      listStaff(),
      listCustomers(),
      listConversations(),
      listPayments(month.start, month.end),
      listServices().catch(() => []),
      getConnection().then((c) => c.status === 'connected').catch(() => false),
    ])
      .then(([
        todayS, monthS, prevMonthS, appts, ileri, settings, staff, customers,
        conversations, monthPayments, services, waConnected,
      ]) => {
        const slots = settings.slot_times ?? [];
        const activeStaff = staff.filter((s) => s.active).length;
        const activeAppts = appts.filter((a) => a.status !== 'cancelled').length;
        const monthPrefix = month.start.slice(0, 7);

        setData({
          bugun: {
            randevu: activeAppts,
            tahsilat: todayS.total,
            doluluk: occupancy(activeAppts, slots.length, activeStaff)?.percent ?? null,
            yeniDanisan: customers.filter((c) => c.first_seen.slice(0, 7) === monthPrefix).length,
          },
          gorevListesi: gorevler({
            serviceCount: services.length,
            hasContact: Boolean(
              String(settings.clinic_address ?? '').trim() ||
              String(settings.clinic_phone ?? '').trim(),
            ),
            waConnected,
            waitingConversations: conversations.filter((c) => c.waiting).length,
            pendingAppointments: appts.filter((a) => a.status === 'pending').length,
            monthPaymentCount: monthS.count,
          }),
          appts,
          upcoming: yaklasanlar(ileri, t.start),
          slots,
          monthRevenue: monthS.total,
          prevMonthToDateRevenue: prevMonthS.total,
          waConnected,
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

  const now = new Date();

  return (
    <>
      <QuickActions
        openAt={openAt}
        onOpened={() => setOpenAt(null)}
        onCreated={(created) => {
          setNotice(
            randevuBildirimi(created.appointment, created.notified, dayRange(0).start),
          );
          load();
        }}
        onSent={(name) => setNotice({ text: `${name} kişisine mesaj gönderildi.`, baskaGun: false })}
      />

      <header>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-45)', letterSpacing: '0.04em' }}>
          {gunSatiri(now)}
        </p>
        <h1 style={{ margin: '4px 0 0', fontSize: 25, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {selamlama(now.getHours())}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-60)' }}>
          {ozetSatiri({
            randevu: data.bugun.randevu,
            bosSlot: bosSlotSayisi(data.slots, data.appts),
            tahsilat: data.bugun.tahsilat,
          })}
        </p>
      </header>

      {notice && (
        <div
          style={{
            background: 'var(--forest-3)', color: 'var(--forest-2)',
            border: '1px solid var(--line)', borderRadius: 'var(--r-card)',
            padding: '10px 16px', fontSize: 12.5, display: 'flex', gap: 12,
            alignItems: 'center', lineHeight: 1.5,
          }}
        >
          <span style={{ flex: 1 }}>
            {notice.text}
            {notice.baskaGun && (
              <span style={{ display: 'block', marginTop: 2, color: 'var(--ink-60)' }}>
                Başka bir güne yazıldı — bugünün akışında görünmüyor.
              </span>
            )}
          </span>
          {notice.baskaGun && (
            <Link
              to="/randevu"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ textDecoration: 'none' }}
            >
              Takvimde aç
            </Link>
          )}
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            onClick={() => setNotice(null)}
          >
            Tamam
          </button>
        </div>
      )}

      {!data.waConnected && <NasilCalisir />}

      <div
        style={{
          display: 'grid', gap: 14,
          gridTemplateColumns: 'minmax(0, 1.62fr) minmax(280px, 0.95fr)',
        }}
      >
        <div data-tour="akis" style={{ minWidth: 0 }}>
          <GununAkisi
            items={data.appts}
            slots={data.slots}
            upcoming={data.upcoming}
            onPick={setOpenAt}
          />
        </div>
        <div
          data-tour="isler"
          style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}
        >
          <BugunPanel data={data.bugun} />
          <BekleyenIsler items={data.gorevListesi} />
        </div>
      </div>

      <DailyRevenueChart
        days={data.days}
        monthToDate={data.monthRevenue}
        prevMonthToDate={data.prevMonthToDateRevenue}
        today={dayRange(0).start}
      />

      {tourOn && <Tour steps={TOUR} onDone={endTour} />}
    </>
  );
}
