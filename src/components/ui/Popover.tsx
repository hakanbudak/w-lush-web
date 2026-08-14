import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Tetikleyicinin ekrandaki yeri. */
export interface Rect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

/** Bir öğenin şu anki dikdörtgeni; panel açılırken bir kez ölçülüyor. */
export const rectOf = (el: Element | null | undefined): Rect | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, width: r.width };
};

/**
 * Bir alanın altına açılan panel: konumu, portalı ve ekrana sığmayı tek
 * yerde tutar. Açılır liste ve takvim aynı sorunu yaşıyor, ikinci kopya
 * yazmak ikisinin zamanla ayrışması demek.
 *
 * `document.body`'ye portal ile çiziliyor. Sebebi somut: modal gövdesi
 * (`modals.tsx`) `overflow: auto` taşıyor ve bu alanların çoğu modal içinde;
 * kutunun içine çizilen panel alt kenarda kırpılırdı.
 */
export default function Popover({
  anchor,
  width,
  maxHeight,
  children,
  ...rest
}: {
  anchor: Rect;
  /** Verilmezse tetikleyici kadar geniş. */
  width?: number;
  maxHeight?: number;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top?: number; bottom?: number }>({
    top: anchor.bottom + 4,
  });

  // Aşağıda yer yoksa yukarı açılır: ekranın dışına taşan panelin alt kısmı
  // hiç görünmezdi.
  useLayoutEffect(() => {
    const height = Math.min(ref.current?.scrollHeight ?? 0, maxHeight ?? Infinity);
    const fitsBelow = anchor.bottom + 4 + height <= window.innerHeight - 8;
    setPlacement(
      fitsBelow
        ? { top: anchor.bottom + 4 }
        : { bottom: Math.max(8, window.innerHeight - anchor.top + 4) },
    );
  }, [anchor.bottom, anchor.top, maxHeight, children]);

  return createPortal(
    <div
      ref={ref}
      {...rest}
      style={{
        position: 'fixed',
        left: anchor.left,
        width: width ?? anchor.width,
        ...placement,
        maxHeight,
        overflowY: maxHeight ? 'auto' : undefined,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        boxShadow: '0 10px 28px rgba(23,35,61,0.16)',
        zIndex: 90,
        ...rest.style,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
