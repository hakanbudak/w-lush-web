import { Link } from 'react-router-dom';
import { Icon } from '../icons';
import type { Appointment } from '../../api/clinic';

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Onaylı', cls: 'wl-chip wl-chip-good' },
  pending: { label: 'Bekliyor', cls: 'wl-chip wl-chip-warn' },
  cancelled: { label: 'İptal', cls: 'wl-chip wl-chip-cream' },
};

const maskPhone = (p: string): string => (p.length > 6 ? `${p.slice(0, 6)}•••${p.slice(-2)}` : p);

const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••';

const AVATAR = ['var(--forest)', 'var(--sage)', 'var(--champagne)', 'var(--lavender)'];

export default function TodayAppointments({
  items,
  slots,
}: {
  items: Appointment[];
  slots: string[];
}) {
  const active = items.filter((a) => a.status !== 'cancelled');
  const taken = new Set(active.map((a) => a.appt_time));
  const free = slots.filter((s) => !taken.has(s)).length;
  const hours = slots.length > 0 ? `${slots[0]} — ${slots[slots.length - 1]}` : 'Saat tanımsız';

  return (
    <div
      style={{
        background: 'var(--paper)', border: '1px solid var(--line)',
        borderRadius: 12, overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--line)',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Bugünün randevuları</div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>
            {hours} · {active.length} seans · {free} boş slot
          </div>
        </div>
        <Link
          to="/randevu"
          className="wl-btn wl-btn-ghost wl-btn-sm"
          style={{ borderRadius: 6, fontSize: 12, textDecoration: 'none' }}
        >
          Takvimde aç {Icon.arrow}
        </Link>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>
          Bugün için randevu yok.
        </div>
      ) : (
        <table className="wl-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Saat</th>
              <th>Danışan</th>
              <th>Hizmet</th>
              <th>Uzman</th>
              <th style={{ width: 110 }}>Durum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a, i) => {
              const who = a.customer_name || maskPhone(a.phone);
              const st = STATUS[a.status] ?? { label: a.status, cls: 'wl-chip wl-chip-cream' };
              return (
                <tr key={a.id}>
                  <td>
                    <span className="wl-mono" style={{ fontSize: 12 }}>{a.appt_time}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 26, height: 26, borderRadius: 999,
                          background: AVATAR[i % AVATAR.length], color: 'var(--cream)',
                          display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 500,
                        }}
                      >
                        {initials(who)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{who}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>{a.service_name}</td>
                  <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>
                    {a.staff_name || 'Atanmamış'}
                  </td>
                  <td><span className={st.cls}>{st.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
