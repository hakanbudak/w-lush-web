import { useEffect, useRef, useState } from 'react';
import Popover, { rectOf, type Rect } from './Popover';

/**
 * Hizmet renkleri. Katalogdaki grup renkleriyle aynı — merkez kendi
 * hizmetini eklerken takvimin diline yabancı bir ton seçmesin diye sınırlı
 * bir paletten seçiyor. Hepsi beyaz metinle en az 4.1:1 kontrast veriyor;
 * bloklar bu renkle dolduruluyor ve üstüne beyaz yazılıyor.
 */
export const SERVICE_COLORS: { hex: string; label: string }[] = [
  { hex: '#0B8A57', label: 'Yeşil' },
  { hex: '#1667C7', label: 'Mavi' },
  { hex: '#0E7C8C', label: 'Turkuaz' },
  { hex: '#6837C9', label: 'Mor' },
  { hex: '#D24A0B', label: 'Turuncu' },
  { hex: '#C2185B', label: 'Pembe' },
  { hex: '#A21CAF', label: 'Magenta' },
  { hex: '#B06A00', label: 'Kehribar' },
  { hex: '#5C8A0F', label: 'Zeytin' },
  { hex: '#BE123C', label: 'Kırmızı' },
  { hex: '#0F766E', label: 'Çam' },
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
          style={{ width: 16, height: 16, borderRadius: 5, background: value || '#0B8A57' }}
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
