import { useEffect, useState } from 'react';
import {
  assignAppointmentStaff,
  cancelAppointment,
  confirmAppointment,
  listAppointments,
  type Appointment,
} from '../../api/clinic';
import { listStaff, type StaffMember } from '../../api/staff';
import { Icon } from '../icons';
import { Chip } from '../ui';

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const GUNAD = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']; // JS getDay: 0=Paz

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUNAD[d.getDay()]}`;
}

function maskPhone(p: string): string {
  return p.length < 6 ? p : `${p.slice(0, 4)}••••${p.slice(-2)}`;
}

function statusInfo(s: string): { tone: 'good' | 'blush' | 'cream'; label: string } {
  if (s === 'confirmed' || s === 'onayli') return { tone: 'good', label: 'Onaylı' };
  if (s === 'cancelled' || s === 'iptal') return { tone: 'blush', label: 'İptal' };
  return { tone: 'cream', label: 'Bekliyor' };
}

export default function AppointmentList() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  function load() {
    setLoading(true);
    setError(null);
    listAppointments()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  // Seçicide yalnız aktif personel görünür; pasife alınmış biri geçmiş
  // randevularda adıyla durur ama yeni atama alamaz.
  useEffect(() => {
    listStaff()
      .then((rows) => setStaff(rows.filter((s) => s.active)))
      .catch(() => setStaff([]));
  }, []);

  async function act(id: number, kind: 'confirm' | 'cancel') {
    setBusy(id);
    setError(null);
    try {
      const updated = await (kind === 'confirm'
        ? confirmAppointment(id)
        : cancelAppointment(id));
      setItems((cur) =>
        cur ? cur.map((a) => (a.id === id ? updated : a)) : cur,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function assign(id: number, staffId: number | null) {
    setBusy(id);
    setError(null);
    try {
      const updated = await assignAppointmentStaff(id, staffId);
      setItems((cur) => (cur ? cur.map((a) => (a.id === id ? updated : a)) : cur));
    } catch (e) {
      // Seçim state'e yazılmadığı için ekran kendiliğinden eski değere döner.
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
          <div style={{ fontSize: 14, fontWeight: 600 }}>WhatsApp Randevuları</div>
          <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>· bot üzerinden alınan gerçek kayıtlar</span>
        </div>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={load} disabled={loading}>
          {loading ? '…' : 'Yenile'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--bad)', padding: '12px 20px' }}>
          {error} — API çalışıyor mu? (uvicorn :8000)
        </div>
      )}
      {!error && loading && !items && (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '16px 20px' }}>Yükleniyor…</div>
      )}
      {!error && items && items.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '16px 20px' }}>
          Henüz WhatsApp'tan randevu yok. Bot üzerinden bir randevu alınınca burada görünür.
        </div>
      )}
      {items && items.length > 0 && (
        <div style={{ maxHeight: 5 * 52, overflowY: 'auto' }}>
          <table className="wl-table" style={{ width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--paper)', zIndex: 1 }}>
              <tr>
                <th>Tarih</th>
                <th>Saat</th>
                <th>Hizmet</th>
                <th>Müşteri</th>
                <th style={{ width: 150 }}>Personel</th>
                <th>Durum</th>
                <th style={{ width: 76 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const st = statusInfo(a.status);
                const isPending = a.status === 'pending' || a.status === 'bekliyor';
                const isBusy = busy === a.id;
                return (
                  <tr key={a.id}>
                    <td>{fmtDate(a.appt_date)}</td>
                    <td className="wl-mono">{a.appt_time}</td>
                    <td style={{ fontWeight: 500 }}>{a.service_name}</td>
                    <td className="wl-mono" style={{ color: 'var(--ink-60)' }}>
                      {a.customer_name || maskPhone(a.phone)}
                    </td>
                    <td>
                      <select
                        value={a.staff_id ?? ''}
                        disabled={isBusy}
                        onChange={(e) =>
                          assign(a.id, e.target.value === '' ? null : Number(e.target.value))
                        }
                        style={{
                          border: '1px solid var(--line)', borderRadius: 8, padding: '4px 8px',
                          font: 'inherit', fontSize: 11, background: 'var(--cream)',
                          maxWidth: 140,
                        }}
                      >
                        <option value="">Atanmamış</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Chip tone={st.tone} small>
                        {st.label}
                      </Chip>
                    </td>
                    <td>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            title="Onayla — müşteriye WhatsApp mesajı gönderir"
                            disabled={isBusy}
                            onClick={() => act(a.id, 'confirm')}
                            style={{
                              width: 28, height: 28, padding: 0, borderRadius: 6, border: 'none', cursor: 'pointer',
                              background: 'var(--forest)', color: 'var(--cream)',
                              display: 'grid', placeItems: 'center',
                            }}
                          >
                            {isBusy ? '…' : Icon.check}
                          </button>
                          <button
                            title="İptal — müşteriye iptal mesajı gönderir"
                            disabled={isBusy}
                            onClick={() => act(a.id, 'cancel')}
                            style={{
                              width: 28, height: 28, padding: 0, borderRadius: 6, cursor: 'pointer',
                              background: 'transparent', color: 'var(--bad)',
                              border: '1px solid var(--line)',
                              display: 'grid', placeItems: 'center',
                            }}
                          >
                            {Icon.x}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-40)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

