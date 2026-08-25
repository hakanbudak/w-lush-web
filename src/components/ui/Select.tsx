import { useCallback, useId, useRef, useState, type CSSProperties } from 'react';
import { indexOfValue, moveIndex, type Option } from '../../utils/listbox';
import OptionList, { type Rect } from './OptionList';
import { useCloseOnOutsideScroll } from './Popover';

/**
 * Listeden seçim alanı — native `<select>`in yerine.
 *
 * Native olanın bedava verdiği şeyleri elle veriyoruz: klavye gezinmesi,
 * rol/durum bildirimi, seçili öğeye kaydırma. Karşılığında panel her
 * tarayıcıda ve her işletim sisteminde aynı görünüyor.
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Seçilmedi',
  style,
  className,
  disabled = false,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [active, setActive] = useState(-1);

  const open = anchor !== null;
  const selected = options.find((o) => o.value === value);

  const openList = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    setAnchor({ top: r.top, bottom: r.bottom, left: r.left, width: r.width });
    setActive(Math.max(0, indexOfValue(options, value)));
  };

  const close = (refocus = false) => {
    setAnchor(null);
    if (refocus) buttonRef.current?.focus();
  };

  const pick = (option: Option) => {
    onChange(option.value);
    close(true);
  };

  useCloseOnOutsideScroll(open, useCallback(() => setAnchor(null), []));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (options[active]) pick(options[active]);
      return;
    }
    if (e.key === 'Tab') {
      close();
      return;
    }
    const next = moveIndex(e.key, active, options.length);
    if (next !== null) {
      e.preventDefault();
      setActive(next);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        className={className}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        onBlur={() => close()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          ...style,
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: selected ? 'var(--ink)' : 'var(--ink-45)',
          }}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, color: 'var(--ink-45)' }}
          aria-hidden="true"
        >
          <path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
        </svg>
      </button>
      {anchor && (
        <OptionList
          anchor={anchor}
          options={options}
          activeIndex={active}
          selectedValue={value}
          listId={listId}
          onPick={pick}
          onHover={setActive}
        />
      )}
    </>
  );
}
