import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  cancelAppointment,
  confirmAppointment,
  getSettings,
  listAppointments,
  type Appointment,
  type AppointmentCreated,
} from '../api/clinic';
import { listStaff, type StaffMember } from '../api/staff';
import AppointmentList from '../components/randevu/AppointmentList';
import AppointmentModal from '../components/randevu/AppointmentModal';
import SlotGrid, { type SlotColumn, type SlotItem } from '../components/randevu/SlotGrid';
import { Chip } from '../components/ui';
import {
  addDays, dayLabel, fullDate, gridRows, isoDate, isoDay, startOfWeek,
} from '../utils/calendar';

type View = 'gun' | 'hafta';

const UNASSIGNED = 'none';

const STATUS: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' }> = {
  confirmed: { label: 'Onaylı', tone: 'good' },
  pending: { label: 'Bekliyor', tone: 'warn' },
  cancelled: { label: 'İptal', tone: 'bad' },
};

const maskPhone = (p: string): string => (p.length > 6 ? `${p.slice(0, 6)}•••${p.slice(-2)}` : p);

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
      return [
        { key: UNASSIGNED, title: 'Atanmamış' },
        ...staff.map((s) => ({ key: String(s.id), title: s.name, sub: s.role })),
      ];
    }
    const first = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(first, i))
      .filter((d) => openDays.includes(isoDay(d)))
      .map((d) => ({ key: isoDate(d), title: dayLabel(d) }));
  }, [view, staff, anchor, openDays]);

  // Renk personelden gelir; atanmamış son rengi alır.
  const colorOf = useCallback(
    (staffId: number | null) => {
      if (staffId === null) return 4;
      const idx = staff.findIndex((s) => s.id === staffId);
      return idx < 0 ? 4 : idx;
    },
    [staff],
  );

  const gridItems: SlotItem[] = useMemo(
    () =>
      (items ?? []).map((a) => ({
        id: a.id,
        slot: a.appt_time,
        columnKey: view === 'gun' ? String(a.staff_id ?? UNASSIGNED) : a.appt_date,
        title: a.customer_name || maskPhone(a.phone),
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

  const act = async (id: number, kind: 'confirm' | 'cancel') => {
    setError(null);
    try {
      const updated = await (kind === 'confirm' ? confirmAppointment(id) : cancelAppointment(id));
      setItems((cur) => (cur ? cur.map((a) => (a.id === id ? updated : a)) : cur));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* gezinme */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: 8, padding: 3 }}>
          {([['gun', 'Gün'], ['hafta', 'Hafta']] as [View, string][]).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className="wl-btn wl-btn-sm"
              style={{
                height: 28, borderRadius: 6, fontSize: 12,
                background: view === k ? 'var(--paper)' : 'transparent',
                color: view === k ? 'var(--ink)' : 'var(--ink-60)',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8 }}
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <button
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8, fontSize: 12 }}
            onClick={() => setAnchor(new Date())}
          >
            Bugün
          </button>
          <button
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8 }}
            onClick={() => step(1)}
          >
            ›
          </button>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>
          {view === 'gun' ? fullDate(anchor) : `${dayLabel(range.start)} – ${dayLabel(range.end)}`}
        </div>

        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ marginLeft: 'auto', borderRadius: 8, fontSize: 12 }}
          onClick={() =>
            setCreating({ date: isoDate(anchor), time: slots[0] ?? '', staffId: null })
          }
          disabled={slots.length === 0}
        >
          Yeni randevu
        </button>
      </div>

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
              />
            </div>
          </>
        )}
      </div>

      {/* detay */}
      {selected && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {selected.customer_name || maskPhone(selected.phone)}
            </div>
            <Chip tone={STATUS[selected.status]?.tone ?? 'warn'} small>
              {STATUS[selected.status]?.label ?? selected.status}
            </Chip>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {selected.status === 'pending' && (
                <>
                  <button
                    className="wl-btn wl-btn-sm"
                    style={{ borderRadius: 8, fontSize: 12 }}
                    onClick={() => act(selected.id, 'confirm')}
                  >
                    Onayla
                  </button>
                  <button
                    className="wl-btn wl-btn-ghost wl-btn-sm"
                    style={{ borderRadius: 8, fontSize: 12, color: 'var(--bad)' }}
                    onClick={() => act(selected.id, 'cancel')}
                  >
                    İptal et
                  </button>
                </>
              )}
              <button
                className="wl-btn wl-btn-ghost wl-btn-sm"
                style={{ borderRadius: 8, fontSize: 12 }}
                onClick={() => setSelectedId(null)}
              >
                Kapat
              </button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 8, lineHeight: 1.6 }}>
            {selected.appt_date} · {selected.appt_time} · {selected.service_name}
            <br />
            Personel: {selected.staff_name || 'Atanmamış'}
          </div>
        </div>
      )}

      {/* gerçek randevu listesi (onay/iptal/atama burada) */}
      <AppointmentList />

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
