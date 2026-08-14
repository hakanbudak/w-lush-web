import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../../api/client';
import {
  assignAppointmentStaff,
  cancelAppointment,
  confirmAppointment,
  type Appointment,
} from '../../api/clinic';
import { listConversations } from '../../api/conversations';
import type { StaffMember } from '../../api/staff';
import { Modal } from '../modals';
import Select from '../ui/Select';
import { displayName, formatPhone } from '../../utils/people';

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  confirmed: { label: 'Onaylı', bg: 'var(--forest-3)', color: 'var(--forest-2)' },
  pending: { label: 'Bekliyor', bg: 'var(--warn-soft)', color: 'var(--warn)' },
  cancelled: { label: 'İptal', bg: 'var(--neutral-soft)', color: 'var(--neutral)' },
};


const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••';

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'baseline' }}>
      <span style={{ width: 88, color: 'var(--ink-45)', flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

export default function AppointmentDetail({
  appointment,
  staff,
  onClose,
  onChanged,
  onMessage,
}: {
  appointment: Appointment;
  staff: StaffMember[];
  onClose: () => void;
  onChanged: (updated: Appointment, message: string) => void;
  onMessage: (phone: string, name: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Konuşması olmayan numaraya API yazmaya izin vermiyor; düğmeyi boşuna
  // göstermek yerine nedenini yazıyoruz.
  const [hasThread, setHasThread] = useState<boolean | null>(null);

  useEffect(() => {
    listConversations()
      .then((rows) => setHasThread(rows.some((r) => r.phone === appointment.phone)))
      .catch(() => setHasThread(false));
  }, [appointment.phone]);

  const run = (fn: () => Promise<Appointment>, message: string) => {
    setBusy(true);
    setError(null);
    fn()
      .then((updated) => {
        onChanged(updated, message);
        onClose();
      })
      .catch((e: unknown) => {
        const api = e instanceof ApiError ? e : null;
        setError(api?.detail || 'İşlem tamamlanamadı.');
        setBusy(false);
      });
  };

  const who = displayName({ name: appointment.customer_name, phone: appointment.phone });
  const st = STATUS[appointment.status] ?? {
    label: appointment.status,
    bg: 'var(--neutral-soft)',
    color: 'var(--neutral)',
  };

  return (
    <Modal title="Randevu" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--forest)',
              color: 'var(--navy-ink)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initials(who)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wl-display" style={{ fontSize: 16 }}>
              {who}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-45)' }}>
              {formatPhone(appointment.phone)}
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 999,
              background: st.bg,
              color: st.color,
            }}
          >
            {st.label}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Line label="Tarih · saat">
            {appointment.appt_date} · {appointment.appt_time}
          </Line>
          <Line label="Hizmet">{appointment.service_name || '—'}</Line>
          <Line label="Uzman">
            <Select
              value={appointment.staff_id === null ? '' : String(appointment.staff_id)}
              disabled={busy}
              ariaLabel="Uzman"
              onChange={(v) =>
                run(
                  () => assignAppointmentStaff(appointment.id, v === '' ? null : Number(v)),
                  'Personel ataması güncellendi.',
                )
              }
              options={[
                { value: '', label: 'Atanmamış' },
                ...staff.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
              style={{
                width: '100%',
                border: '1px solid var(--line-strong)',
                borderRadius: 8,
                padding: '7px 9px',
                font: 'inherit',
                fontSize: 13,
                background: 'var(--cream)',
              }}
            />
          </Line>
        </div>

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        {hasThread === false && (
          <div style={{ fontSize: 11, color: 'var(--ink-45)' }}>
            Bu numarayla henüz bir WhatsApp konuşmanız yok, mesaj gönderilemez.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {appointment.status === 'pending' && (
            <button
              type="button"
              className="wl-btn wl-btn-sm"
              disabled={busy}
              onClick={() => run(() => confirmAppointment(appointment.id), 'Randevu onaylandı.')}
            >
              Onayla
            </button>
          )}
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            disabled={busy || hasThread !== true}
            onClick={() => onMessage(appointment.phone, who)}
          >
            Mesaj gönder
          </button>
          {appointment.status !== 'cancelled' && (
            <button
              type="button"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ color: 'var(--bad)' }}
              disabled={busy}
              onClick={() => run(() => cancelAppointment(appointment.id), 'Randevu iptal edildi.')}
            >
              İptal et
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
