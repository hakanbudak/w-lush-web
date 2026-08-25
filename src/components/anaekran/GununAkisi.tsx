import { Link } from 'react-router-dom';
import type { Appointment } from '../../api/clinic';
import { gunAkisi } from '../../utils/akis';
import { kisaGun } from '../../utils/karsilama';
import { displayName } from '../../utils/people';
import { Icon } from '../icons';

/** Hizmeti silinmiş eski randevunun rengi. */
const NOTR = 'var(--neutral)';

/**
 * Günün akışı: çalışma saatleri baştan sona, dolu saatler danışanıyla,
 * boş saatler doğrudan randevu açan satırla. Tablo yerine liste, çünkü
 * ekranın işi "bugün nasıl geçecek" sorusunu tek bakışta yanıtlamak.
 */
export default function GununAkisi({
  items,
  slots,
  upcoming,
  colorOf,
  day,
  onPick,
}: {
  items: Appointment[];
  slots: string[];
  /** Hizmet rengi — takvimdeki blok rengiyle aynı kaynak. */
  colorOf: (serviceName: string) => string | null;
  /** Akışın gösterdiği gün. 20:00'den sonra yarına geçiyor. */
  day: { iso: string; yarin: boolean };
  /** Bugünden sonraki ilk randevular; yalnızca bugün boşken gösteriliyor. */
  upcoming: Appointment[];
  onPick: (time: string) => void;
}) {
  const rows = gunAkisi(slots, items);
  const bosGun = rows.every((r) => r.appointments.length === 0);

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
        <h2 style={{ flex: 1, margin: 0, fontSize: 14.5, fontWeight: 600 }}>
          {day.yarin ? 'Yarının akışı' : 'Günün akışı'}
          {day.yarin && (
            <span
              style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--ink-45)' }}
            >
              {' '}· bugün kapandı
            </span>
          )}
        </h2>
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
          {day.yarin ? 'Yarın' : 'Bugün'} için çalışma saati tanımlı değil. Sistem
          ayarlarından gün saatlerini girince akış burada görünür.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {rows.map((r, i) => (
            <li
              key={r.time}
              style={{
                display: 'grid', gridTemplateColumns: '68px minmax(0, 1fr)',
                alignItems: 'stretch', gap: 12, padding: '8px 20px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                background: r.appointments.length ? 'transparent' : 'var(--cream-2)',
              }}
            >
              <span
                className="wl-mono"
                style={{
                  fontSize: 12.5, paddingTop: 9,
                  color: r.appointments.length ? 'var(--ink)' : 'var(--ink-45)',
                }}
              >
                {r.time}
              </span>

              {r.appointments.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onPick(r.time)}
                  style={{
                    justifySelf: 'start', alignSelf: 'center', border: 'none',
                    background: 'transparent', font: 'inherit', fontSize: 12.5,
                    color: 'var(--ink-45)', cursor: 'pointer', padding: '4px 0',
                  }}
                >
                  Boş — randevu ekle
                </button>
              ) : (
                // Aynı saatteki randevular yan yana. Tek randevu tüm genişliği
                // kaplıyor, yani sık durumda görüntü boyalı bir satırdan
                // ayırt edilmiyor; dördü olduğunda genişliği paylaşıyorlar.
                <span
                  style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 0,
                  }}
                >
                  {r.appointments.map((a) => {
                    const who = displayName({ name: a.customer_name, phone: a.phone });
                    const renk = colorOf(a.service_name) ?? NOTR;
                    const bekliyor = a.status === 'pending';
                    return (
                      <span
                        key={a.id}
                        title={`${who} · ${a.service_name}${
                          a.staff_name ? ` · ${a.staff_name}` : ' · uzman atanmadı'
                        }${bekliyor ? ' · onay bekliyor' : ''}`}
                        style={{
                          flex: '1 1 150px', minWidth: 0, borderRadius: 9,
                          padding: '7px 10px', background: renk, color: '#FFFFFF',
                          border: bekliyor
                            ? '1px dashed rgba(255, 255, 255, 0.85)'
                            : '1px solid transparent',
                        }}
                      >
                        <span
                          style={{
                            display: 'block', fontSize: 12.5, fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {a.status === 'completed' && '✓ '}
                          {who}
                        </span>
                        <span
                          style={{
                            display: 'block', fontSize: 11,
                            color: 'rgba(255, 255, 255, 0.82)',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {a.service_name}
                          {/* Uzman adı yalnızca aynı saatte birden fazla
                              randevu varken ayırt edici; tek randevuda yer
                              kaplamasın diye gizli. */}
                          {r.appointments.length > 1 &&
                            (a.staff_name ? ` · ${a.staff_name}` : ' · atanmadı')}
                        </span>
                      </span>
                    );
                  })}
                </span>
              )}
            </li>
          ))}
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
