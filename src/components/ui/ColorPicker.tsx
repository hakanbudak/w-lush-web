import { useEffect, useRef, useState } from 'react';
import Popover, { rectOf, type Rect } from './Popover';

/**
 * Hizmet renkleri. Katalogdaki grup renkleriyle aynı — merkez kendi
 * hizmetini eklerken takvimin diline yabancı bir ton seçmesin diye sınırlı
 * bir paletten seçiyor.
 */
export const SERVICE_COLORS: { hex: string; label: string }[] = [
  { hex: '#2E7D5B', label: 'Yeşil' },
  { hex: '#4A85B5', label: 'Mavi' },
  { hex: '#5B4FA3', label: 'Mor' },
  { hex: '#C2582F', label: 'Kiremit' },
  { hex: '#B0577F', label: 'Gül' },
  { hex: '#8A6416', label: 'Kehribar' },
  { hex: '#2A7B84', label: 'Turkuaz' },
  { hex: '#6B7A2F', label: 'Zeytin' },
];

export default function ColorPicker({
  value,
  onChange,
  ariaLabel = 'Hizmet rengi',
}: {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel?: string;
}) {
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!anchor) return;
    const kapat = () => setAnchor(null);
    window.addEventListener('resize', kapat);
    window.addEventListener('scroll', kapat, true);
    return () => {
      window.removeEventListener('resize', kapat);
      window.removeEventListener('scroll', kapat, true);
    };
  }, [anchor]);

  const secili = SERVICE_COLORS.find((c) => c.hex === value);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`${ariaLabel}${secili ? ` · ${secili.label}` : ''}`}
        onClick={() => setAnchor(anchor ? null : rectOf(btn.current))}
        style={{
          width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
          border: '1px solid var(--line-strong)', background: 'var(--paper)',
          display: 'grid', placeItems: 'center', padding: 0,
        }}
      >
        <span
          style={{ width: 16, height: 16, borderRadius: 5, background: value || '#2E7D5B' }}
        />
      </button>

      {anchor && (
        <Popover anchor={anchor} width={168}>
          <div
            role="listbox"
            aria-label={ariaLabel}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: 8 }}
          >
            {SERVICE_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                role="option"
                aria-selected={c.hex === value}
                aria-label={c.label}
                onClick={() => {
                  onChange(c.hex);
                  setAnchor(null);
                }}
                style={{
                  width: 30, height: 30, borderRadius: 8, cursor: 'pointer', padding: 0,
                  background: c.hex,
                  border: c.hex === value
                    ? '2px solid var(--ink)'
                    : '1px solid var(--line-strong)',
                }}
              />
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}
