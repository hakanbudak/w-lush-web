import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ApiError } from '../../api/client';
import {
  assignAppointmentStaff,
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  getSettings,
  rescheduleAppointment,
  type Appointment,
} from '../../api/clinic';
import { listConversations } from '../../api/conversations';
import {
  listCustomerConsents, type ConsentSignature,
} from '../../api/consent';
import DatePicker from '../ui/DatePicker';
import type { StaffMember } from '../../api/staff';
import { Modal } from '../modals';
import CustomerNotes from '../customer/CustomerNotes';
import Select from '../ui/Select';
import { displayName, formatPhone } from '../../utils/people';

/** Erteleme formundaki iki alanın ortak görünümü — uzman seçicisiyle aynı. */
const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '7px 9px',
  font: 'inherit',
  fontSize: 13,
  background: 'var(--cream)',
};

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  confirmed: { label: 'Onaylı', bg: 'var(--forest-3)', color: 'var(--forest-2)' },
  completed: { label: 'Tamamlandı', bg: 'var(--forest)', color: 'var(--paper)' },
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
  // Erteleme formu. Kapalıyken hiç çizilmiyor: en sık kullanılan iki düğme
  // (onayla / mesaj) tarih seçicinin altında kalmasın.
  const [moving, setMoving] = useState(false);
  const [day, setDay] = useState(appointment.appt_date);
  const [time, setTime] = useState(appointment.appt_time);
  const [slots, setSlots] = useState<string[]>([]);
  // Danışan telefondaysa ikinci bir bildirim gürültü.
  const [notify, setNotify] = useState(true);
  // Konuşması olmayan numaraya API yazmaya izin vermiyor; düğmeyi boşuna
  // göstermek yerine nedenini yazıyoruz.
  const [hasThread, setHasThread] = useState<boolean | null>(null);
  // İmza bekleyen onam formları. Randevu açılırken hizmete bağlı form
  // varsa sunucu kendiliğinden oluşturuyor; operatörün burada görmesi
  // gerekiyor, yoksa danışan gittikten sonra hatırlanıyor.
  const [consents, setConsents] = useState<ConsentSignature[]>([]);

  useEffect(() => {
    // Saat listesi kliniğin kendi slot_times ayarından; sunucu bu listede
    // olmayan saati zaten reddediyor.
    getSettings()
      .then((s) => setSlots(s.slot_times ?? []))
      .catch(() => setSlots([]));
  }, []);

  useEffect(() => {
    listConversations()
      .then((rows) => setHasThread(rows.some((r) => r.phone === appointment.phone)))
      .catch(() => setHasThread(false));
  }, [appointment.phone]);

  useEffect(() => {
    listCustomerConsents(appointment.phone)
      .then((rows) => setConsents(rows.filter((r) => !r.signed)))
      .catch(() => setConsents([]));
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

        {/* Not kişiye ait, bu randevuya değil: seansa girmeden önce
            hatırlanması gereken şey burada da görünsün. */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div className="wl-label" style={{ marginBottom: 8 }}>
            Danışan notları
          </div>
          <CustomerNotes phone={appointment.phone} />
        </div>

        {consents.length > 0 && (
          <div
            style={{
              background: 'var(--warn-soft)', color: 'var(--warn)',
              borderRadius: 10, padding: '10px 12px', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1.5,
            }}
          >
            <span style={{ flex: 1 }}>
              <strong>İmza bekleyen onam:</strong>{' '}
              {consents.map((c) => c.title).join(', ')}
            </span>
            <a
              href={`/onam/${consents[0].token}`}
              target="_blank"
              rel="noreferrer"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}
            >
              Tablette imzalat
            </a>
          </div>
        )}

        {hasThread === false && (
          <div style={{ fontSize: 11, color: 'var(--ink-45)' }}>
            Bu numarayla henüz bir WhatsApp konuşmanız yok, mesaj gönderilemez.
          </div>
        )}

        {moving && (
          <div
            style={{
              borderTop: '1px solid var(--line)',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div className="wl-label">Yeni gün ve saat</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                {/* Geçmişe taşımak meşru: dün gelmiş biri bugün kaydediliyor
                    olabilir, o yüzden alt sınır yok. */}
                <DatePicker
                  value={day}
                  onChange={setDay}
                  ariaLabel="Yeni gün"
                  style={fieldStyle}
                />
              </div>
              <div style={{ flex: '1 1 110px', minWidth: 0 }}>
                <Select
                  value={time}
                  onChange={setTime}
                  ariaLabel="Yeni saat"
                  options={slots.map((s) => ({ value: s, label: s }))}
                  style={fieldStyle}
                />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
              Danışana yeni saati WhatsApp'tan bildir
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="wl-btn wl-btn-ghost wl-btn-sm"
                onClick={() => {
                  setMoving(false);
                  setDay(appointment.appt_date);
                  setTime(appointment.appt_time);
                  setError(null);
                }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="wl-btn wl-btn-sm"
                disabled={busy || !day || !time}
                onClick={() =>
                  run(
                    () =>
                      rescheduleAppointment(appointment.id, {
                        appt_date: day,
                        appt_time: time,
                        notify,
                      }),
                    'Randevu ertelendi.',
                  )
                }
              >
                Taşı
              </button>
            </div>
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
          {/* Seans, tarihin geçmesine değil operatörün "geldi" demesine
              bağlı: gelmeyen danışanın paketinden seans düşmemeli. */}
          {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
            <button
              type="button"
              className="wl-btn wl-btn-sm"
              disabled={busy}
              onClick={() =>
                run(
                  () => completeAppointment(appointment.id),
                  'Randevu tamamlandı. Danışanın paketi varsa bir seans düşüldü.',
                )
              }
            >
              Tamamlandı
            </button>
          )}
          {appointment.status !== 'cancelled' && !moving && (
            <button
              type="button"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              disabled={busy}
              onClick={() => setMoving(true)}
            >
              Ertele
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
              onClick={() =>
                run(
                  () => cancelAppointment(appointment.id),
                  appointment.status === 'completed'
                    ? 'Randevu iptal edildi, düşülen seans pakete geri verildi.'
                    : 'Randevu iptal edildi.',
                )
              }
            >
              İptal et
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
