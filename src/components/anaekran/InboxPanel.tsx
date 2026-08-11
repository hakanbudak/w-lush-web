import { Link } from 'react-router-dom';
import { Icon } from '../icons';
import type { Conversation } from '../../api/conversations';

const MAX = 5;

const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••';

/** "2 dk", "1 sa", "3 gün" — gelen kutusu için kaba yeterli. */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} dk`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} sa`;
  return `${Math.round(mins / (60 * 24))} gün`;
}

export default function InboxPanel({ items }: { items: Conversation[] }) {
  const waiting = items.filter((c) => c.waiting).length;
  const shown = items.slice(0, MAX);

  return (
    <div data-tour="inbox" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
      <div
        style={{
          padding: '14px 16px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ color: 'var(--wa-green)' }}>{Icon.whatsapp}</span>
        <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp</div>
        {waiting > 0 && (
          <span
            style={{
              marginLeft: 'auto', fontSize: 10, padding: '1px 6px', borderRadius: 4,
              background: '#DCF8C6', color: '#075E54', fontWeight: 600,
            }}
          >
            {waiting} yanıt bekliyor
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)' }}>
          Henüz konuşma yok.
        </div>
      ) : (
        shown.map((c, i) => (
          <Link
            key={c.phone}
            to="/mesajlar"
            style={{
              padding: '12px 16px',
              borderBottom: i < shown.length - 1 ? '1px solid var(--line)' : 'none',
              display: 'flex', gap: 10, alignItems: 'center',
              textDecoration: 'none', color: 'inherit',
            }}
          >
            <div
              style={{
                width: 28, height: 28, borderRadius: 999, background: 'var(--cream-3)',
                color: 'var(--ink)', display: 'grid', placeItems: 'center',
                fontSize: 10, fontWeight: 500, flexShrink: 0,
              }}
            >
              {initials(c.customer_name || c.phone)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {c.customer_name || c.phone}
                </div>
                <span style={{ fontSize: 10, color: 'var(--ink-40)' }}>{ago(c.last_at)}</span>
              </div>
              <div
                style={{
                  fontSize: 11, color: 'var(--ink-60)', marginTop: 2, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {/* ✦ = botun konuşmayı sürdürdüğü anlamına gelir; handoff ise
                    operatör devralmıştır. */}
                {!c.handoff && <span style={{ color: 'var(--lavender-2)' }}>✦ </span>}
                {c.last_message}
              </div>
            </div>
            {c.waiting && (
              <span
                className="wl-chip wl-chip-warn"
                style={{ height: 18, fontSize: 9, flexShrink: 0 }}
              >
                Bekliyor
              </span>
            )}
          </Link>
        ))
      )}
    </div>
  );
}
