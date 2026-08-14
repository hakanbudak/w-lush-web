import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  addDays,
  inRange,
  isoDate,
  monthGrid,
  monthLabel,
  sameDay,
  trDate,
} from '../../utils/calendar';
import Popover, { rectOf, type Rect } from './Popover';

const GUNLER = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

/** ISO metinden yerel Date; "2026-08-12" hep o takvim günü demek. */
const parse = (iso: string): Date | null => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Tarih alanı — native `<input type="date">` yerine.
 *
 * Değer ISO (`2026-08-12`) kalıyor çünkü API öyle bekliyor; ekranda
 * `12.08.2026` görünüyor. `min`/`max` dışındaki günler tıklanamıyor: gelir ve
 * gider gelecek tarihi kabul etmiyor, kullanıcı hatayı ancak "Kaydet"e
 * bastıktan sonra görmek yerine o günü hiç seçemiyor.
 */
export default function DatePicker({
  value,
  onChange,
  min,
  max,
  style,
  ariaLabel,
}: {
  /** ISO: YYYY-MM-DD. Boş olabilir. */
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  // Izgarada gezinen gün. Seçim yapılmadan da hareket ediyor: klavyeyle
  // gezerken her adımda değer değiştirmek, vazgeçen kullanıcıya yanlış
  // tarihi bırakırdı.
  const [cursor, setCursor] = useState<Date>(() => parse(value) ?? new Date());

  const open = anchor !== null;
  const today = new Date();
  const selected = parse(value);

  const openList = () => {
    const r = rectOf(buttonRef.current);
    if (!r) return;
    setCursor(parse(value) ?? new Date());
    setAnchor(r);
  };

  const close = (refocus = false) => {
    setAnchor(null);
    if (refocus) buttonRef.current?.focus();
  };

  const pick = (d: Date) => {
    if (!inRange(d, min, max)) return;
    onChange(isoDate(d));
    close(true);
  };

  // Sayfa kayarsa panel çapasından kopar; kovalamak yerine kapatıyoruz.
  useEffect(() => {
    if (!open) return;
    const shut = () => setAnchor(null);
    window.addEventListener('scroll', shut, true);
    window.addEventListener('resize', shut);
    return () => {
      window.removeEventListener('scroll', shut, true);
      window.removeEventListener('resize', shut);
    };
  }, [open]);

  const move = (days: number) => setCursor((c) => addDays(c, days));
  const moveMonth = (n: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, c.getDate()));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close(true);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(cursor);
        return;
      case 'Tab':
        close();
        return;
      case 'ArrowLeft':
        e.preventDefault();
        move(-1);
        return;
      case 'ArrowRight':
        e.preventDefault();
        move(1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(-7);
        return;
      case 'ArrowDown':
        e.preventDefault();
        move(7);
        return;
      case 'PageUp':
        e.preventDefault();
        moveMonth(-1);
        return;
      case 'PageDown':
        e.preventDefault();
        moveMonth(1);
        return;
      default:
    }
  };

  const days = monthGrid(cursor.getFullYear(), cursor.getMonth());

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        onBlur={() => close()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          textAlign: 'left',
          cursor: 'pointer',
          ...style,
        }}
      >
        <span style={{ color: value ? 'var(--ink)' : 'var(--ink-45)' }}>
          {value ? trDate(value) : 'Tarih seçin'}
        </span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, color: 'var(--ink-45)' }}
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {anchor && (
        <Popover anchor={anchor} width={252} role="dialog" aria-label="Takvim">
          <div style={{ padding: 10 }} onMouseDown={(e) => e.preventDefault()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <button
                type="button"
                aria-label="Önceki ay"
                onClick={() => moveMonth(-1)}
                style={arrow}
              >
                ‹
              </button>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                {monthLabel(cursor.getFullYear(), cursor.getMonth())}
              </span>
              <button
                type="button"
                aria-label="Sonraki ay"
                onClick={() => moveMonth(1)}
                style={arrow}
              >
                ›
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {GUNLER.map((g) => (
                <div
                  key={g}
                  style={{
                    fontSize: 10,
                    color: 'var(--ink-45)',
                    textAlign: 'center',
                    paddingBottom: 4,
                  }}
                >
                  {g}
                </div>
              ))}
              {days.map((d) => {
                const outside = d.getMonth() !== cursor.getMonth();
                const usable = inRange(d, min, max);
                const isSelected = selected !== null && sameDay(d, selected);
                return (
                  <button
                    key={isoDate(d)}
                    type="button"
                    disabled={!usable}
                    aria-label={trDate(isoDate(d))}
                    aria-current={sameDay(d, today) ? 'date' : undefined}
                    aria-pressed={isSelected}
                    onClick={() => pick(d)}
                    style={{
                      border: sameDay(d, cursor)
                        ? '1px solid var(--forest)'
                        : '1px solid transparent',
                      borderRadius: 7,
                      padding: '6px 0',
                      font: 'inherit',
                      fontSize: 12,
                      cursor: usable ? 'pointer' : 'default',
                      background: isSelected ? 'var(--forest)' : 'transparent',
                      color: isSelected
                        ? 'var(--cream)'
                        : !usable
                          ? 'var(--ink-20)'
                          : outside
                            ? 'var(--ink-40)'
                            : 'var(--ink)',
                      fontWeight: sameDay(d, today) && !isSelected ? 700 : 400,
                    }}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => pick(today)}
              disabled={!inRange(today, min, max)}
              style={{
                marginTop: 8,
                width: '100%',
                border: '1px solid var(--line)',
                borderRadius: 7,
                padding: '6px 0',
                font: 'inherit',
                fontSize: 11.5,
                background: 'var(--cream)',
                cursor: inRange(today, min, max) ? 'pointer' : 'default',
                color: inRange(today, min, max) ? 'var(--ink)' : 'var(--ink-40)',
              }}
            >
              Bugün
            </button>
          </div>
        </Popover>
      )}
    </>
  );
}

const arrow: CSSProperties = {
  border: 'none',
  background: 'transparent',
  font: 'inherit',
  fontSize: 16,
  lineHeight: 1,
  color: 'var(--ink-60)',
  cursor: 'pointer',
  padding: '2px 8px',
};
