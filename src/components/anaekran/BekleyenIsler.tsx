import { Link } from 'react-router-dom';
import type { Gorev } from '../../utils/gorevler';

const DOT: Record<Gorev['tone'], string> = {
  urgent: 'var(--dot-urgent)',
  warn: 'var(--dot-warn)',
  idle: 'var(--ink-40)',
};

/** Kurulum eksikleri ve bekleyen operasyon işleri tek listede. */
export default function BekleyenIsler({ items }: { items: Gorev[] }) {
  return (
    <section
      style={{
        background: 'var(--paper)', border: '1px solid var(--line-strong)',
        borderRadius: 14, padding: '15px 20px',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>Bekleyen işler</h2>

      {items.length === 0 ? (
        <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--ink-45)' }}>
          Bekleyen iş yok — kurulum tamam, mesajların yanıtlanmış.
        </p>
      ) : (
        <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
          {items.map((g, i) => (
            <li
              key={g.key}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 7, height: 7, borderRadius: 999, background: DOT[g.tone],
                  marginTop: 5, flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>
                  {g.title}
                </span>
                <span
                  style={{
                    display: 'block', fontSize: 11.5, color: 'var(--ink-45)',
                    lineHeight: 1.5, marginTop: 1,
                  }}
                >
                  {g.sub}
                </span>
              </span>
              <Link
                to={g.to}
                className="wl-btn wl-btn-ghost wl-btn-sm"
                style={{ borderRadius: 8, fontSize: 11.5, textDecoration: 'none', flexShrink: 0 }}
              >
                {g.cta}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
