import { useCallback, useId, useRef, useState, type CSSProperties } from 'react';
import { filterOptions, moveIndex, type Option } from '../../utils/listbox';
import OptionList, { type Rect } from './OptionList';
import { useCloseOnOutsideScroll } from './Popover';

/**
 * Yazılabilir seçim alanı — `<datalist>`in yerine.
 *
 * Select'ten tek farkı: listede olmayan metin de kabul ediliyor. Kayıtsız
 * ziyaretçiye ödeme girilebilmesi buna bağlı; kullanıcıyı listedeki bir
 * kayda zorlamak, bir istatistik daha derli toplu görünsün diye veriyi
 * bozmak olurdu.
 */
export default function Combobox({
  value,
  onChange,
  onPick,
  options,
  placeholder,
  style,
  ariaLabel,
}: {
  value: string;
  /** Serbest yazım. */
  onChange: (value: string) => void;
  /** Listeden seçim — çağıran ek alanları da doldurabilsin diye ayrı. */
  onPick: (option: Option) => void;
  options: Option[];
  placeholder?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [active, setActive] = useState(-1);

  const open = anchor !== null;
  const shown = filterOptions(options, value);

  const openList = () => {
    const r = inputRef.current?.getBoundingClientRect();
    if (!r) return;
    setAnchor({ top: r.top, bottom: r.bottom, left: r.left, width: r.width });
  };

  const close = (refocus = false) => {
    setAnchor(null);
    setActive(-1);
    if (refocus) inputRef.current?.focus();
  };

  const pick = (option: Option) => {
    onPick(option);
    close(true);
  };

  useCloseOnOutsideScroll(open, useCallback(() => setAnchor(null), []));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'Tab') {
      close();
      return;
    }
    if (!open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Enter') {
      // Vurgulanan yoksa Enter'a dokunmuyoruz: yazılan metin geçerli bir
      // cevap, formu göndermesini engellemek kullanıcıyı şaşırtır.
      if (active >= 0 && shown[active]) {
        e.preventDefault();
        pick(shown[active]);
      }
      return;
    }
    const next = moveIndex(e.key, active, shown.length);
    if (next !== null) {
      e.preventDefault();
      setActive(next);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(-1);
          if (!open) openList();
        }}
        onFocus={openList}
        onBlur={() => close()}
        onKeyDown={onKeyDown}
        style={style}
      />
      {anchor && (
        <OptionList
          anchor={anchor}
          options={shown}
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
