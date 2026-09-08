import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getFlowGraph, type FlowGraph, type FlowNode } from '../../api/whatsapp';

/*
 * Konuşma akışının şeması.
 *
 * Düğümler ve kenarlar sunucudan geliyor (`/api/whatsapp/flow-graph`);
 * burada sadece yerleşim ve çizim var. Akışın kendisi Python tarafında
 * tanımlı ve testlerle koda bağlı — buraya kopyalasaydık ikisi ayrışırdı.
 *
 * Yerleşim otomatik: katmanlar menüden başlayıp genişlikte aranıyor.
 * Elle konum yazmak daha derli toplu dururdu ama akışa yeni bir durum
 * eklendiğinde o durum sessizce şemadan düşerdi.
 */

/** Durumun ait olduğu öbek: kartın rengini ve üstündeki etiketi
 *  belirliyor. Renk süs değil — randevu dalı, randevularım dalı ve
 *  operatöre devredilmiş konuşmalar şemada bir bakışta ayrılıyor. */
const KINDS: { match: (s: string) => boolean; label: string; hue: string }[] = [
  { match: (s) => s === 'MENU', label: 'Giriş', hue: 'var(--forest)' },
  { match: (s) => s.startsWith('BOOK_') || s === 'ASK_NAME', label: 'Randevu', hue: 'var(--blue)' },
  { match: (s) => s.startsWith('MYAPPTS_'), label: 'Randevularım', hue: 'var(--ai)' },
  { match: (s) => s === 'SILENT' || s.startsWith('WAITING_'), label: 'Operatör', hue: 'var(--dot-urgent)' },
];
const OTHER = { label: 'Serbest', hue: 'var(--ink-60)' };

const kindOf = (state: string) => KINDS.find((k) => k.match(state)) ?? OTHER;

const PILL_H = 26;
const PAD = 28;
const ROW_GAP = 66;
const CARD_W = 196;
const EST_H = 92;

/** Aynı adımda kalan ve menüye dönen oklar eğri olarak çizilmiyor: on
 *  kadar geri kıvrılan eğri şemayı okunmaz hale getiriyordu. Onun yerine
 *  düğümün üstünde rozet oluyorlar — bilgi duruyor, karmaşa gitmiyor. */
type Edge = { from: string; to: string };

function layout(nodes: FlowNode[], entries: string[]) {
  const byState = new Map(nodes.map((n) => [n.state, n]));
  const layer = new Map<string, number>();
  layer.set('MENU', 0);

  let frontier = entries.filter((s) => s !== 'MENU' && byState.has(s));
  frontier.forEach((s) => layer.set(s, 1));
  let depth = 1;
  while (frontier.length && depth < 12) {
    const next: string[] = [];
    for (const state of frontier) {
      for (const to of byState.get(state)?.goes_to ?? []) {
        if (to === state || to === 'MENU' || layer.has(to)) continue;
        layer.set(to, depth + 1);
        next.push(to);
      }
    }
    frontier = next;
    depth += 1;
  }
  // Yalnızca panel hareketiyle girilen durumlar menüden erişilemiyor;
  // onları en alta koyuyoruz ki şemadan düşmesinler.
  const max = Math.max(...layer.values());
  nodes.forEach((n) => {
    if (!layer.has(n.state)) layer.set(n.state, max + 1);
  });
  return layer;
}

export default function AkisSemasi() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [graph, setGraph] = useState<FlowGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const drag = useRef<{ id: string; x: number; y: number; dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => {
    getFlowGraph()
      .then(setGraph)
      .catch(() => setError('Akış şeması yüklenemedi.'));
  }, []);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setWidth(canvas.clientWidth);
    setHeights((prev) => {
      const next = { ...prev };
      let changed = false;
      nodeRefs.current.forEach((el, id) => {
        const h = el.offsetHeight;
        if (h && Math.abs(h - (next[id] ?? 0)) > 0.5) {
          next[id] = h;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  useLayoutEffect(() => {
    if (!graph) return;
    measure();
    const observer = new ResizeObserver(measure);
    if (canvasRef.current) observer.observe(canvasRef.current);
    nodeRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [graph, measure]);

  if (error) return <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>;
  if (!graph) return <div style={{ fontSize: 12, color: 'var(--ink-45)' }}>Yükleniyor…</div>;

  const entries = graph.global_rules.flatMap((r) => r.goes_to);
  const layer = layout(graph.nodes, entries);
  const rows = [...new Set(graph.nodes.map((n) => layer.get(n.state) ?? 0))].sort((a, b) => a - b);
  const rowH = rows.map((r) =>
    Math.max(...graph.nodes.filter((n) => layer.get(n.state) === r).map((n) => heights[n.state] ?? EST_H)),
  );
  const rowY: number[] = [];
  rows.forEach((_, i) => {
    rowY[i] = i === 0 ? PAD : rowY[i - 1] + rowH[i - 1] + ROW_GAP;
  });
  const canvasH = rowY[rows.length - 1] + rowH[rows.length - 1] + PAD;
  const cw = width || 640;

  const place = (n: FlowNode) => {
    const row = layer.get(n.state) ?? 0;
    const peers = graph.nodes.filter((x) => layer.get(x.state) === row);
    const i = peers.findIndex((x) => x.state === n.state);
    const off = offsets[n.state];
    const w = Math.min(CARD_W, cw * 0.9);
    return {
      w,
      cx: ((i + 1) / (peers.length + 1)) * cw + (off?.dx ?? 0),
      top: rowY[rows.indexOf(row)] + (off?.dy ?? 0),
    };
  };

  const edges: Edge[] = graph.nodes.flatMap((n) =>
    n.goes_to
      .filter((to) => to !== n.state && to !== 'MENU')
      .map((to) => ({ from: n.state, to })),
  );

  const curve = ({ from, to }: Edge) => {
    const a = graph.nodes.find((n) => n.state === from);
    const b = graph.nodes.find((n) => n.state === to);
    if (!a || !b) return '';
    const pa = place(a);
    const pb = place(b);
    const y1 = pa.top + (heights[from] ?? EST_H);
    const y2 = pb.top + PILL_H;
    const k = Math.min(Math.max(Math.abs(y2 - y1) * 0.55, 20), 70);
    return `M ${pa.cx} ${y1} C ${pa.cx} ${y1 + k}, ${pb.cx} ${y2 - k}, ${pb.cx} ${y2}`;
  };

  const down = (n: FlowNode) => (e: React.PointerEvent<HTMLDivElement>) => {
    const off = offsets[n.state];
    drag.current = {
      id: n.state, x: e.clientX, y: e.clientY,
      dx: off?.dx ?? 0, dy: off?.dy ?? 0, moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const move = (n: FlowNode) => (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== n.state) return;
    const dx = d.dx + e.clientX - d.x;
    const dy = d.dy + e.clientY - d.y;
    if (!d.moved && Math.hypot(dx - d.dx, dy - d.dy) < 3) return;
    d.moved = true;
    setOffsets((cur) => ({ ...cur, [n.state]: { dx, dy } }));
  };

  const up = (n: FlowNode) => () => {
    const d = drag.current;
    if (d?.id === n.state) {
      if (d.moved) setTimeout(() => (drag.current = null), 0);
      else drag.current = null;
    }
  };

  const lit = (e: Edge) => selected === e.from || selected === e.to;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        ref={canvasRef}
        style={{
          position: 'relative', width: '100%', height: canvasH, userSelect: 'none',
          overflow: 'hidden', borderRadius: 12, border: '1px solid var(--line)',
          background: 'var(--cream-2)',
          backgroundImage: 'radial-gradient(var(--line-strong) 1px, transparent 1.25px)',
          backgroundSize: '22px 22px',
        }}
      >
        <svg width={cw} height={canvasH} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {edges.map((e) => (
            <path
              key={`${e.from}-${e.to}`}
              d={curve(e)}
              fill="none"
              stroke={lit(e) ? kindOf(e.from).hue : 'var(--line-strong)'}
              strokeWidth={lit(e) ? 1.75 : 1.25}
            />
          ))}
        </svg>

        {graph.nodes.map((n) => {
          const { w, cx, top } = place(n);
          const active = selected === n.state;
          const kind = kindOf(n.state);
          const loops = n.goes_to.includes(n.state);
          const toMenu = n.goes_to.includes('MENU') && n.state !== 'MENU';
          return (
            <div
              key={n.state}
              ref={(el) => {
                if (el) nodeRefs.current.set(n.state, el);
                else nodeRefs.current.delete(n.state);
              }}
              onPointerDown={down(n)}
              onPointerMove={move(n)}
              onPointerUp={up(n)}
              style={{
                position: 'absolute', left: cx, top, width: w,
                transform: 'translateX(-50%)', touchAction: 'none',
                zIndex: drag.current?.id === n.state ? 2 : 1,
              }}
            >
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', height: PILL_H - 6,
                  padding: '0 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  marginBottom: 6, color: kind.hue,
                  background: `color-mix(in srgb, ${kind.hue} 13%, var(--cream))`,
                }}
              >
                {kind.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (drag.current?.moved) return;
                  setSelected(active ? null : n.state);
                }}
                aria-pressed={active}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit',
                  background: 'var(--cream)', borderRadius: 16, padding: 10,
                  border: active ? `1.5px solid ${kind.hue}` : '1px solid var(--line)',
                  boxShadow: active
                    ? `0 0 0 3px color-mix(in srgb, ${kind.hue} 14%, transparent)`
                    : '0 1px 4px rgba(0,0,0,0.05)',
                  display: 'flex', gap: 9, alignItems: 'flex-start',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0, width: 30, height: 30, borderRadius: 9,
                    display: 'grid', placeItems: 'center', marginTop: 1,
                    background: `color-mix(in srgb, ${kind.hue} 12%, var(--cream))`,
                    boxShadow: `0 0 0 1px color-mix(in srgb, ${kind.hue} 22%, transparent)`,
                    color: kind.hue, fontSize: 12, fontWeight: 700,
                  }}
                >
                  {(layer.get(n.state) ?? 0) + 1}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                    {n.label}
                  </span>
                  <span
                    className="wl-mono"
                    style={{ display: 'block', fontSize: 10, color: 'var(--ink-45)', marginTop: 1 }}
                  >
                    {n.state}
                  </span>
                  {(loops || toMenu) && (
                    <span style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {loops && <Rozet>aynı adımda kalır</Rozet>}
                      {toMenu && <Rozet>menüye döner</Rozet>}
                    </span>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <Kurallar baslik="Her durumdan geçerli" rules={graph.global_rules} />
      <Kurallar baslik="Panelden tetiklenir" rules={graph.panel_rules} />
    </div>
  );
}

function Rozet({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10, padding: '1px 6px', borderRadius: 5,
        background: 'var(--ink-08)', color: 'var(--ink-60)',
      }}
    >
      {children}
    </span>
  );
}

function Kurallar({ baslik, rules }: { baslik: string; rules: { label: string; goes_to: string[] }[] }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-60)', marginBottom: 5 }}>
        {baslik}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {rules.map((r) => (
          <span
            key={r.label}
            style={{
              fontSize: 11.5, padding: '3px 8px', borderRadius: 7,
              border: '1px solid var(--line)', background: 'var(--cream)', color: 'var(--ink-60)',
            }}
          >
            {r.label}
            <span className="wl-mono" style={{ color: 'var(--ink-40)', marginLeft: 5 }}>
              → {r.goes_to.join(' / ')}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
