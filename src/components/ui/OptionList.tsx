import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Option } from '../../utils/listbox';

/** Panelin en fazla kaplayacağı yükseklik; fazlası kaydırılır. */
const MAX_HEIGHT = 240;

interface Rect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

/**
 * Açılır listenin paneli. Select ve Combobox aynı paneli kullanıyor: konum,
 * vurgu ve kaydırma tek yerde kalsın.
 *
 * Panel `document.body`'ye portal ile çiziliyor. Sebebi somut: modal gövdesi
 * (`modals.tsx`) `overflow: auto` taşıyor ve select'lerin çoğu modal içinde;
 * kutunun içine çizilen panel alt sıralarda kırpılırdı.
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
  const [placement, setPlacement] = useState<{ top?: number; bottom?: number }>({
    top: anchor.bottom + 4,
  });

  // Aşağıda yer yoksa yukarı açılır: ekranın dışına taşan liste,
  // seçeneklerin son üçünü görünmez yapardı.
  useLayoutEffect(() => {
    const height = Math.min(listRef.current?.scrollHeight ?? 0, MAX_HEIGHT);
    const fitsBelow = anchor.bottom + 4 + height <= window.innerHeight - 8;
    setPlacement(
      fitsBelow
        ? { top: anchor.bottom + 4 }
        : { bottom: Math.max(8, window.innerHeight - anchor.top + 4) },
    );
  }, [anchor.bottom, anchor.top, options.length]);

  // Vurgulanan öğe görünür kalsın; 48 slotluk saat listesinde ok tuşuyla
  // ilerlerken panelin altında kaybolurdu.
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return createPortal(
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      style={{
        position: 'fixed',
        left: anchor.left,
        width: anchor.width,
        ...placement,
        maxHeight: MAX_HEIGHT,
        overflowY: 'auto',
        margin: 0,
        padding: 4,
        listStyle: 'none',
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        boxShadow: '0 10px 28px rgba(23,35,61,0.16)',
        zIndex: 90,
      }}
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
    </ul>,
    document.body,
  );
}

export type { Rect };
