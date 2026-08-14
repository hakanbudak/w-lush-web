import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAll, type SearchResults } from '../../api/search';
import { Icon } from '../icons';
import { displayName } from '../../utils/people';

const EMPTY: SearchResults = { customers: [], appointments: [], payments: [] };

const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div className="wl-label" style={{ padding: '4px 12px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  onClick,
  primary,
  secondary,
}: {
  onClick: () => void;
  primary: string;
  secondary: string;
}) {
  return (
    <button
      type="button"
      // onBlur listeyi onClick'ten önce kapatır; mousedown olmasa tıklama kaybolur.
      onMouseDown={onClick}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'baseline',
        gap: 8,
        padding: '7px 12px',
        border: 'none',
        background: 'transparent',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 13 }}>{primary}</span>
      <span style={{ fontSize: 11, color: 'var(--ink-45)' }}>{secondary}</span>
    </button>
  );
}

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Yazmayı bırakınca ara. Her tuşta istek atmak sunucuyu boşuna yorar.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(EMPTY);
      return;
    }
    const t = setTimeout(() => {
      searchAll(term)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .catch(() => setResults(EMPTY));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (path: string) => {
    setOpen(false);
    setQ('');
    navigate(path);
  };

  const total =
    results.customers.length + results.appointments.length + results.payments.length;

  return (
    <div data-tour="search" style={{ width: 400, position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 13, display: 'flex', color: 'var(--ink-40)' }}>
          {Icon.search}
        </span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder="Danışan, randevu, ödeme ara"
          style={{
            width: '100%',
            height: 36,
            padding: '0 52px 0 38px',
            border: '1px solid var(--line-strong)',
            borderRadius: 9,
            background: 'var(--cream)',
            font: 'inherit',
            fontSize: 13,
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: 10,
            fontSize: 10,
            color: 'var(--ink-40)',
            border: '1px solid var(--line-strong)',
            padding: '2px 6px',
            borderRadius: 5,
            background: 'var(--paper)',
          }}
        >
          ⌘K
        </span>
      </div>

      {open && q.trim().length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: 42,
            left: 0,
            right: 0,
            zIndex: 40,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            boxShadow: '0 18px 40px -12px rgba(23,35,61,0.28)',
            maxHeight: 380,
            overflowY: 'auto',
          }}
        >
          {total === 0 ? (
            <div style={{ padding: 14, fontSize: 12, color: 'var(--ink-45)' }}>Sonuç yok.</div>
          ) : (
            <>
              {results.customers.length > 0 && (
                <Group title="Danışanlar">
                  {results.customers.map((c) => (
                    <Row
                      key={c.phone}
                      primary={displayName(c)}
                      secondary={c.name ? c.phone : ''}
                      onClick={() => go(`/danisan/${encodeURIComponent(c.phone)}`)}
                    />
                  ))}
                </Group>
              )}
              {results.appointments.length > 0 && (
                <Group title="Randevular">
                  {results.appointments.map((a) => (
                    <Row
                      key={a.id}
                      primary={displayName({ name: a.customer_name, phone: a.phone })}
                      secondary={`${a.appt_date} · ${a.appt_time} · ${a.service_name}`}
                      onClick={() => go('/randevu')}
                    />
                  ))}
                </Group>
              )}
              {results.payments.length > 0 && (
                <Group title="Ödemeler">
                  {results.payments.map((p) => (
                    <Row
                      key={p.id}
                      primary={displayName({ name: p.customer_name, phone: p.phone })}
                      secondary={`${p.paid_at} · ${money(p.amount)} · ${p.service_name}`}
                      onClick={() => go('/gelir')}
                    />
                  ))}
                </Group>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
