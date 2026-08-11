import { useCallback, useEffect, useState } from 'react';

export interface TourStep {
  target: string; // data-tour değeri
  place: 'right' | 'below' | 'left';
  title: string;
  text: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 6;
const TIP_WIDTH = 300;

/**
 * Hoş geldiniz turu. Hedefler `ref` yerine `data-tour` ile bulunuyor: beş
 * hedefin üçü (kenar menü, arama, aksiyonlar) kabukta, bu bileşenin ağacının
 * dışında.
 */
export default function Tour({
  steps,
  onDone,
}: {
  steps: TourStep[];
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${steps[i].target}"]`);
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
  }, [i, steps]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Hedef bulunamazsa tur sessizce biter: ekranda olmayan bir şeyi işaret
  // eden boş bir spot, turun kendisinden kötüdür.
  useEffect(() => {
    if (box === null) onDone();
  }, [box, onDone]);

  if (box === null) return null;

  const step = steps[i];
  const tip =
    step.place === 'right'
      ? { left: box.x + box.w + 18, top: Math.max(20, box.y) }
      : step.place === 'left'
        ? { left: Math.max(20, box.x - TIP_WIDTH - 18), top: Math.max(20, box.y) }
        : { left: Math.max(20, box.x), top: box.y + box.h + 14 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div
        style={{
          position: 'absolute',
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          border: '2px solid var(--forest)',
          borderRadius: 10,
          boxShadow: '0 0 0 9999px var(--scrim)',
          transition: 'all .35s ease',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          ...tip,
          width: TIP_WIDTH,
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-card)',
          padding: 16,
          boxShadow: '0 18px 40px -12px rgba(23,35,61,0.4)',
          transition: 'all .35s ease',
        }}
      >
        <div className="wl-label" style={{ marginBottom: 6 }}>
          {i + 1} / {steps.length}
        </div>
        <div className="wl-display" style={{ fontSize: 15, marginBottom: 6 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-60)', lineHeight: 1.5 }}>
          {step.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ fontSize: 12 }}
            onClick={onDone}
          >
            Turu atla
          </button>
          <div style={{ flex: 1 }} />
          {i > 0 && (
            <button
              type="button"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ fontSize: 12 }}
              onClick={() => setI(i - 1)}
            >
              Geri
            </button>
          )}
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ fontSize: 12 }}
            onClick={() => (i + 1 < steps.length ? setI(i + 1) : onDone())}
          >
            {i + 1 < steps.length ? 'İleri' : 'Bitir'}
          </button>
        </div>
      </div>
    </div>
  );
}
