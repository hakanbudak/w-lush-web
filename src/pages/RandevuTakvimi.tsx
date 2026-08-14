import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSettings,
  listAppointments,
  type Appointment,
  type AppointmentCreated,
} from '../api/clinic';
import { listStaff, type StaffMember } from '../api/staff';
import AppointmentDetail from '../components/randevu/AppointmentDetail';
import AppointmentModal from '../components/randevu/AppointmentModal';
import { staffColor, UNASSIGNED_COLOR } from '../components/randevu/staffColors';
import { useSetTopBarActions } from '../components/shell/TopBarActions';
import { useToast } from '../components/shell/Toast';
import { Icon } from '../components/icons';
import SlotGrid, { type SlotColumn, type SlotItem } from '../components/randevu/SlotGrid';
import {
  addDays, dayLabel, fullDate, gridRows, isoDate, isoDay, startOfWeek,
} from '../utils/calendar';
import { displayName } from '../utils/people';

type View = 'gun' | 'hafta';

const UNASSIGNED = 'none';


const card: CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: 20,
};

export default function RandevuTakvimi() {
  const [view, setView] = useState<View>('gun');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [openDays, setOpenDays] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // null = kapalı. Açıkken formun ön dolumunu taşır.
  const [creating, setCreating] = useState<
    { date: string; time: string; staffId: number | null } | null
  >(null);
  const [notifyWarning, setNotifyWarning] = useState<string | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  // Görünen aralık: gün görünümünde tek gün, hafta görünümünde Pzt–Paz.
  const range = useMemo(() => {
    if (view === 'gun') return { start: anchor, end: anchor };
    const first = startOfWeek(anchor);
    return { start: first, end: addDays(first, 6) };
  }, [view, anchor]);

  const load = useCallback(() => {
    setError(null);
    listAppointments(isoDate(range.start), isoDate(range.end))
      .then(setItems)
      .catch(() => setError('Randevular yüklenemedi.'));
  }, [range]);

  useEffect(load, [load]);

  useEffect(() => {
    listStaff()
      .then((rows) => setStaff(rows.filter((s) => s.active)))
      .catch(() => setStaff([]));
    getSettings()
      .then((s) => {
        setSlots(s.slot_times ?? []);
        setOpenDays(s.open_days ?? []);
      })
      .catch(() => {
        setSlots([]);
        setOpenDays([]);
      });
  }, []);

  // Gün görünümü: sütun = personel (+ Atanmamış). Hafta: sütun = açık günler.
  const columns: SlotColumn[] = useMemo(() => {
    if (view === 'gun') {
      // Tasarım sırası: uzmanlar önce, "Atanmamış" en sonda.
      return [
        ...staff.map((s) => ({ key: String(s.id), title: s.name, sub: s.role })),
        { key: UNASSIGNED, title: 'Atanmamış', sub: '—' },
      ];
    }
    const first = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(first, i))
      .filter((d) => openDays.includes(isoDay(d)))
      .map((d) => {
        const key = isoDate(d);
        const n = (items ?? []).filter(
          (a) => a.appt_date === key && a.status !== 'cancelled',
        ).length;
        return { key, title: dayLabel(d), sub: `${n} randevu` };
      });
  }, [view, staff, anchor, openDays, items]);

  // Renk personelden gelir; atanmamış son rengi alır.
  const colorOf = useCallback(
    (staffId: number | null): number | null => {
      if (staffId === null) return null;
      const idx = staff.findIndex((s) => s.id === staffId);
      return idx < 0 ? null : idx;
    },
    [staff],
  );

  const legend = useMemo(
    () => [
      ...staff.map((s, i) => ({ label: s.name, color: staffColor(i) })),
      { label: 'Atanmamış', color: UNASSIGNED_COLOR },
    ],
    [staff],
  );

  const gridItems: SlotItem[] = useMemo(
    () =>
      (items ?? []).map((a) => ({
        id: a.id,
        slot: a.appt_time,
        columnKey: view === 'gun' ? String(a.staff_id ?? UNASSIGNED) : a.appt_date,
        title: displayName({ name: a.customer_name, phone: a.phone }),
        subtitle: a.service_name,
        status: a.status,
        colorIndex: colorOf(a.staff_id),
      })),
    [items, view, colorOf],
  );

  // Görünen aralıkta slot listesi dışında bir saat varsa ona da satır açılır;
  // yoksa o randevu ızgarada hiç görünmezdi.
  const { rows: gridRowTimes, off: offSlots } = useMemo(
    () => gridRows(slots, (items ?? []).map((a) => a.appt_time)),
    [slots, items],
  );

  const selected = (items ?? []).find((a) => a.id === selectedId) ?? null;

  // Gün görünümünde sütun personeldir, haftada gündür — ön dolum buna göre.
  const openCreate = (slot: string, columnKey: string) =>
    setCreating(
      view === 'gun'
        ? {
            date: isoDate(anchor),
            time: slot,
            staffId: columnKey === UNASSIGNED ? null : Number(columnKey),
          }
        : { date: columnKey, time: slot, staffId: null },
    );

  const afterCreate = (created: AppointmentCreated) => {
    setNotifyWarning(
      created.notified
        ? null
        : `Randevu oluşturuldu, ancak müşteriye mesaj iletilemedi${
            created.notify_error ? `: ${created.notify_error}` : '.'
          }`,
    );
    setSelectedId(created.appointment.id);
    load();
  };

  const step = (dir: -1 | 1) => setAnchor((d) => addDays(d, view === 'gun' ? dir : dir * 7));


  useSetTopBarActions(
    <>
      <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: 9, padding: 3 }}>
        {([['gun', 'Gün'], ['hafta', 'Hafta']] as [View, string][]).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            className="wl-btn wl-btn-sm"
            style={{
              height: 28,
              borderRadius: 7,
              fontSize: 12,
              background: view === k ? 'var(--paper)' : 'transparent',
              color: view === k ? 'var(--ink)' : 'var(--ink-60)',
              boxShadow: view === k ? '0 1px 2px rgba(23,35,61,0.12)' : 'none',
            }}
          >
            {lbl}
          </button>
        ))}
      </div>
      <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 9 }} onClick={() => step(-1)}>
        ‹
      </button>
      <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 9, fontSize: 12 }} onClick={() => setAnchor(new Date())}>
        Bugün
      </button>
      <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 9 }} onClick={() => step(1)}>
        ›
      </button>
      <span style={{ fontSize: 12.5, fontWeight: 600, marginLeft: 4 }}>
        {view === 'gun' ? fullDate(anchor) : `${dayLabel(range.start)} – ${dayLabel(range.end)}`}
      </span>
      <button
        type="button"
        className="wl-btn wl-btn-sm"
        style={{ height: 34, borderRadius: 9, fontSize: 12.5, fontWeight: 600, marginLeft: 4 }}
        disabled={slots.length === 0}
        onClick={() => setCreating({ date: isoDate(anchor), time: slots[0] ?? '', staffId: null })}
      >
        {Icon.plus}Yeni randevu
      </button>
    </>,
    [view, anchor, slots.length, range.start, range.end],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {notifyWarning && (
        <div
          style={{
            ...card,
            padding: '12px 20px',
            fontSize: 12,
            color: 'var(--ink-60)',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span style={{ flex: 1 }}>{notifyWarning}</span>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8, fontSize: 12 }}
            onClick={() => setNotifyWarning(null)}
          >
            Tamam
          </button>
        </div>
      )}

      {/* ızgara */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px', borderBottom: '1px solid var(--line)',
            fontSize: 14, fontWeight: 600,
          }}
        >
          Takvim
        </div>

        {error && (
          <div style={{ padding: 20, fontSize: 13, color: 'var(--ink-60)' }}>
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

        {!error && slots.length === 0 && (
          <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)', lineHeight: 1.5 }}>
            Çalışma saatleri tanımlanmamış — Sistem &gt; Klinik bilgisi bölümünden ayarlayabilirsiniz.
          </div>
        )}

        {!error && slots.length > 0 && items === null && (
          <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
        )}

        {!error && slots.length > 0 && items !== null && (
          <>
            {view === 'gun' && staff.length === 0 && (
              <div style={{ padding: '12px 20px', fontSize: 11, color: 'var(--ink-40)' }}>
                Personel tanımlanmamış — Sistem &gt; Personel bölümünden ekleyebilirsiniz.
              </div>
            )}
            <div style={{ padding: 12 }}>
              <SlotGrid
                slots={gridRowTimes}
                columns={columns}
                items={gridItems}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onEmptyClick={openCreate}
                offSlots={offSlots}
                legend={legend}
              />
            </div>
          </>
        )}
      </div>

      {selected && (
        <AppointmentDetail
          appointment={selected}
          staff={staff}
          onClose={() => setSelectedId(null)}
          onChanged={(updated, message) => {
            setItems((cur) => (cur ? cur.map((a) => (a.id === updated.id ? updated : a)) : cur));
            toast(message);
          }}
          onMessage={(phone, name) => {
            setSelectedId(null);
            navigate(`/mesajlar?phone=${encodeURIComponent(phone)}`);
            toast(`${name} ile konuşma açıldı.`);
          }}
        />
      )}

      {creating && (
        <AppointmentModal
          slots={slots}
          staff={staff}
          initial={creating}
          onClose={() => setCreating(null)}
          onCreated={afterCreate}
        />
      )}
    </div>
  );
}
