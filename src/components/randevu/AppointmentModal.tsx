import { useEffect, useState, type CSSProperties } from 'react';
import { ApiError } from '../../api/client';
import { getCustomer } from '../../api/customers';
import {
  createAppointment,
  listServices,
  type AppointmentCreated,
  type Service,
} from '../../api/clinic';
import type { StaffMember } from '../../api/staff';
import { Modal } from '../modals';
import Select from '../ui/Select';

const field: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 10px',
  font: 'inherit',
  fontSize: 12,
  background: 'var(--cream)',
  marginTop: 4,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-60)',
  display: 'block',
};

const UNASSIGNED = '';

export default function AppointmentModal({
  slots,
  staff,
  initial,
  onClose,
  onCreated,
}: {
  slots: string[];
  staff: StaffMember[];
  initial: { date: string; time: string; staffId: number | null };
  onClose: () => void;
  onCreated: (created: AppointmentCreated) => void;
}) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [known, setKnown] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [day, setDay] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [staffId, setStaffId] = useState<string>(
    initial.staffId === null ? UNASSIGNED : String(initial.staffId),
  );
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listServices()
      .then((rows) => setServices(rows.filter((s) => s.active)))
      .catch(() => setServices([]));
  }, []);

  // Telefon yazılmayı bıraktıktan sonra mevcut danışan aranır.
  useEffect(() => {
    const digits = phone.trim();
    if (digits.length < 10) {
      setKnown(false);
      return;
    }
    const t = setTimeout(() => {
      getCustomer(digits)
        .then((c) => {
          setKnown(true);
          // İsim yalnızca operatör henüz bir şey yazmadıysa doldurulur.
          setName((cur) => cur || c.name || '');
        })
        // 404 normal sonuçtur: yeni danışan. Hata gösterilmez.
        .catch(() => setKnown(false));
    }, 400);
    return () => clearTimeout(t);
  }, [phone]);

  const submit = () => {
    if (!phone.trim()) {
      setError('Telefon zorunlu.');
      return;
    }
    if (!time) {
      setError('Saat seçilmeli.');
      return;
    }
    setSaving(true);
    setError(null);
    createAppointment({
      phone: phone.trim(),
      customer_name: name.trim(),
      service_name: serviceName.trim(),
      appt_date: day,
      appt_time: time,
      staff_id: staffId === UNASSIGNED ? null : Number(staffId),
      notify,
    })
      .then((created) => {
        onCreated(created);
        onClose();
      })
      .catch((e: unknown) => {
        const api = e instanceof ApiError ? e : null;
        // 409'da form açık kalır: operatör başka saat/personel seçebilsin.
        setError(api?.detail || 'Randevu oluşturulamadı.');
        setSaving(false);
      });
  };

  return (
    <Modal title="Yeni randevu" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={labelStyle}>
          Telefon
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="905321112233"
            style={field}
          />
        </label>

        {known && (
          <div style={{ fontSize: 11, color: 'var(--forest)' }}>
            Mevcut danışan — geçmişi Danışan Profili'nde.
          </div>
        )}

        <label style={labelStyle}>
          Danışan adı
          <input value={name} onChange={(e) => setName(e.target.value)} style={field} />
        </label>

        <label style={labelStyle}>
          Hizmet
          <Select
            value={serviceName}
            onChange={setServiceName}
            options={[
              { value: '', label: 'Seçilmedi' },
              ...services.map((s) => ({ value: s.name, label: s.name })),
            ]}
            style={field}
          />
        </label>

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Tarih
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              style={field}
            />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Saat
            <Select
              value={time}
              onChange={setTime}
              options={[
                { value: '', label: 'Seçilmedi' },
                ...slots.map((s) => ({ value: s, label: s })),
              ]}
              style={field}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Personel
          <Select
            value={staffId}
            onChange={setStaffId}
            options={[
              { value: UNASSIGNED, label: 'Atanmamış' },
              ...staff.map((s) => ({ value: String(s.id), label: s.name })),
            ]}
            style={field}
          />
        </label>

        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
          Müşteriye WhatsApp'tan bilgi ver
        </label>

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor…' : 'Randevu oluştur'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
