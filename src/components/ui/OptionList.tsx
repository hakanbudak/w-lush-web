import { useEffect, useRef } from 'react';
import type { Option } from '../../utils/listbox';
import Popover, { type Rect } from './Popover';

/** Panelin en fazla kaplayacağı yükseklik; fazlası kaydırılır. */
const MAX_HEIGHT = 240;

/**
 * Açılır listenin içeriği. Select ve Combobox aynı listeyi kullanıyor: vurgu
 * ve kaydırma tek yerde kalsın. Konumlandırma Popover'ın işi.
 */
export default function OptionList({
  anchor,
  options,
  activeIndex,
  selectedValue,
  listId,
  onPick,
  onHover,
}: {
  anchor: Rect;
  options: Option[];
  activeIndex: number;
  selectedValue: string;
  listId: string;
  onPick: (option: Option) => void;
  onHover: (index: number) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  // Vurgulanan öğe görünür kalsın; 48 slotluk saat listesinde ok tuşuyla
  // ilerlerken panelin altında kaybolurdu.
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <Popover anchor={anchor} maxHeight={MAX_HEIGHT}>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        style={{ margin: 0, padding: 4, listStyle: 'none' }}
      >
        {options.length === 0 && (
          <li style={{ padding: '8px 10px', fontSize: 12, color: 'var(--ink-45)' }}>
            Eşleşen yok
          </li>
        )}
        {options.map((o, i) => (
          <li
            key={o.value}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={o.value === selectedValue}
            onMouseEnter={() => onHover(i)}
            // onBlur listeyi tıklamadan önce kapatır; mousedown olmasa seçim kaybolur.
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(o);
            }}
            style={{
              padding: '7px 10px',
              borderRadius: 7,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              background: i === activeIndex ? 'var(--cream)' : 'transparent',
              color: 'var(--ink)',
              fontWeight: o.value === selectedValue ? 600 : 400,
            }}
          >
            <span>{o.label}</span>
            {o.value === selectedValue && <span style={{ color: 'var(--forest)' }}>✓</span>}
          </li>
        ))}
      </ul>
    </Popover>
  );
}

export type { Rect };
