import { useEffect, useState } from 'react';
import { getSettings, type AppointmentCreated } from '../../api/clinic';
import { listStaff, type StaffMember } from '../../api/staff';
import { Icon } from '../icons';
import AppointmentModal from '../randevu/AppointmentModal';
import { useSetTopBarActions } from '../shell/TopBarActions';
import SendMessageModal from './SendMessageModal';

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Üst bardaki iki düğme ve açtıkları modaller. */
export default function QuickActions({
  onCreated,
  onSent,
}: {
  onCreated: (created: AppointmentCreated) => void;
  onSent: (name: string) => void;
}) {
  const [modal, setModal] = useState<'msg' | 'appt' | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    getSettings()
      .then((s) => setSlots(s.slot_times ?? []))
      .catch(() => setSlots([]));
    listStaff()
      .then((r) => setStaff(r.filter((s) => s.active)))
      .catch(() => setStaff([]));
  }, []);

  useSetTopBarActions(
    <>
      <button
        type="button"
        onClick={() => setModal('msg')}
        className="wl-btn wl-btn-ghost wl-btn-sm"
        style={{ height: 34, borderRadius: 9, fontSize: 12.5, gap: 7 }}
      >
        <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.chat}</span>
        Mesaj gönder
      </button>
      <button
        type="button"
        onClick={() => setModal('appt')}
        className="wl-btn wl-btn-sm"
        style={{ height: 34, borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
        disabled={slots.length === 0}
      >
        {Icon.plus}Yeni randevu
      </button>
    </>,
    [slots.length],
  );

  return (
    <>
      {modal === 'msg' && <SendMessageModal onClose={() => setModal(null)} onSent={onSent} />}
      {modal === 'appt' && (
        <AppointmentModal
          slots={slots}
          staff={staff}
          initial={{ date: iso(new Date()), time: slots[0] ?? '', staffId: null }}
          onClose={() => setModal(null)}
          onCreated={onCreated}
        />
      )}
    </>
  );
}
