import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Parmakla ya da fareyle imza alanı.
 *
 * Pointer olayları kullanılıyor: fare, dokunmatik ve kalem tek yolla
 * geliyor. Tuval ekran çözünürlüğüne göre ölçekleniyor, yoksa yüksek
 * yoğunluklu ekranlarda çizgi bulanık kalıyor.
 */
export default function SignaturePad({
  onChange,
  disabled = false,
}: {
  /** Boş tuvalde `''` gönderiyor, çizim varken data: URL. */
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [bos, setBos] = useState(true);

  const olcekle = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const oran = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (w === 0 || h === 0) return;
    c.width = w * oran;
    c.height = h * oran;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(oran, oran);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#16222E';
  }, []);

  useEffect(() => {
    olcekle();
    window.addEventListener('resize', olcekle);
    return () => window.removeEventListener('resize', olcekle);
  }, [olcekle]);

  const nokta = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvas.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const bas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    canvas.current?.setPointerCapture(e.pointerId);
    const p = nokta(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const ciz = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const p = nokta(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (bos) setBos(false);
  };

  const birak = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const c = canvas.current;
    if (c) onChange(c.toDataURL('image/png'));
  };

  const temizle = () => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setBos(true);
    onChange('');
  };

  return (
    <div>
      <canvas
        ref={canvas}
        onPointerDown={bas}
        onPointerMove={ciz}
        onPointerUp={birak}
        onPointerLeave={birak}
        aria-label="İmza alanı"
        role="img"
        style={{
          width: '100%', height: 160, borderRadius: 10,
          border: '1px dashed var(--line-strong)', background: 'var(--paper)',
          // Dokunmatikte çizerken sayfa kaymasın.
          touchAction: 'none', cursor: disabled ? 'default' : 'crosshair',
          display: 'block',
        }}
      />
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, marginTop: 6,
          fontSize: 11.5, color: 'var(--ink-45)',
        }}
      >
        <span style={{ flex: 1 }}>
          {bos ? 'Parmağınızla ya da farenizle imzalayın.' : 'İmzanız alındı.'}
        </span>
        {!bos && (
          <button
            type="button"
            onClick={temizle}
            style={{
              border: 'none', background: 'transparent', font: 'inherit',
              fontSize: 11.5, color: 'var(--ink-45)', cursor: 'pointer', padding: 0,
            }}
          >
            Temizle
          </button>
        )}
      </div>
    </div>
  );
}
