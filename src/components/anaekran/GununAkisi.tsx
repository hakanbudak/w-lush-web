import { Link } from 'react-router-dom';
import type { Appointment } from '../../api/clinic';
import { gunAkisi } from '../../utils/akis';
import { kisaGun } from '../../utils/karsilama';
import { displayName } from '../../utils/people';
import { Icon } from '../icons';

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Onaylı', cls: 'wl-chip wl-chip-good' },
  pending: { label: 'Bekliyor', cls: 'wl-chip wl-chip-warn' },
};

const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR') || '••';

/** Danışan adına bağlı sabit renk: aynı kişi her açılışta aynı tonda. */
const AVATAR = ['var(--forest)', 'var(--blue)', 'var(--ai)', 'var(--dot-warn)'];
const tone = (s: string): string => {
  let n = 0;
  for (const ch of s) n = (n + ch.charCodeAt(0)) % 997;
  return AVATAR[n % AVATAR.length];
};

/**
 * Günün akışı: çalışma saatleri baştan sona, dolu saatler danışanıyla,
 * boş saatler doğrudan randevu açan satırla. Tablo yerine liste, çünkü
 * ekranın işi "bugün nasıl geçecek" sorusunu tek bakışta yanıtlamak.
 */
export default function GununAkisi({
  items,
  slots,
  upcoming,
  onPick,
}: {
  items: Appointment[];
  slots: string[];
  /** Bugünden sonraki ilk randevular; yalnızca bugün boşken gösteriliyor. */
  upcoming: Appointment[];
  onPick: (time: string) => void;
}) {
  const rows = gunAkisi(slots, items);
  const bosGun = rows.every((r) => r.appointment === null);

  return (
    <section
      style={{
        background: 'var(--paper)', border: '1px solid var(--line-strong)',
        borderRadius: 14, overflow: 'hidden', minWidth: 0,
      }}
    >
      <header
        style={{
          padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid var(--line)',
        }}
      >
        <h2 style={{ flex: 1, margin: 0, fontSize: 14.5, fontWeight: 600 }}>Günün akışı</h2>
        <Link
          to="/randevu"
          className="wl-btn wl-btn-ghost wl-btn-sm"
          style={{ borderRadius: 8, fontSize: 12, textDecoration: 'none' }}
        >
          Takvimde aç {Icon.arrow}
        </Link>
      </header>

      {rows.length === 0 ? (
        <p style={{ margin: 0, padding: '28px 20px', fontSize: 12.5, color: 'var(--ink-45)' }}>
          Bugün için çalışma saati tanımlı değil. Sistem ayarlarından gün saatlerini
          girince akış burada görünür.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {rows.map((r, i) => {
            const a = r.appointment;
            const who = a ? displayName({ name: a.customer_name, phone: a.phone }) : '';
            const st = a ? STATUS[a.status] : null;
            return (
              <li
                key={`${r.time}-${a?.id ?? 'bos'}`}
                style={{
                  display: 'grid', gridTemplateColumns: '68px minmax(0, 1fr) auto',
                  alignItems: 'center', gap: 12, padding: '11px 20px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                  background: a ? 'transparent' : 'var(--cream-2)',
                }}
              >
                <span
                  className="wl-mono"
                  style={{ fontSize: 12.5, color: a ? 'var(--ink)' : 'var(--ink-45)' }}
                >
                  {r.time}
                </span>

                {a ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 30, height: 30, borderRadius: 999, flexShrink: 0,
                        background: tone(who), color: 'var(--paper)', display: 'grid',
                        placeItems: 'center', fontSize: 10.5, fontWeight: 600,
                      }}
                    >
                      {initials(who)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {who}
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-45)' }}>
                        {a.service_name}
                        {a.staff_name ? ` · ${a.staff_name}` : ' · uzman atanmadı'}
                      </span>
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPick(r.time)}
                    style={{
                      justifySelf: 'start', border: 'none', background: 'transparent',
                      font: 'inherit', fontSize: 12.5, color: 'var(--ink-45)',
                      cursor: 'pointer', padding: 0,
                    }}
                  >
                    Boş — randevu ekle
                  </button>
                )}

                {st && <span className={st.cls}>{st.label}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {bosGun && upcoming.length > 0 && (
        <footer style={{ borderTop: '1px solid var(--line)', padding: '12px 20px' }}>
          <div className="wl-label" style={{ marginBottom: 6 }}>Sıradaki randevular</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {upcoming.map((a) => (
              <li
                key={a.id}
                style={{ display: 'flex', gap: 10, fontSize: 12.5, padding: '3px 0' }}
              >
                <span className="wl-mono" style={{ color: 'var(--ink-60)' }}>
                  {kisaGun(a.appt_date)} {a.appt_time}
                </span>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                               whiteSpace: 'nowrap' }}>
                  {displayName({ name: a.customer_name, phone: a.phone })} · {a.service_name}
                </span>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </section>
  );
}
