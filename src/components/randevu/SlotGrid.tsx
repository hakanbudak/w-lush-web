import { useState } from 'react';
import { blockColor, type BlockColor } from './blockColors';

/**
 * Slot ızgarası: satırlar kliniğin slot saatleri, sütunlar çağıranın verdiği
 * eksen (gün görünümünde personel, hafta görünümünde gün).
 *
 * Bileşen veri çekmez ve randevu kavramı bilmez — bu yüzden iki görünüm de
 * aynı bileşeni kullanabiliyor.
 */


/** Bir hücrede en fazla bu kadar blok çizilir; kalanı "+N" olur. */
const MAX_PER_CELL = 2;

export interface SlotColumn {
  key: string;
  title: string;
  sub?: string;
}

export interface SlotItem {
  id: number;
  slot: string; // "HH:MM" — hangi satır
  columnKey: string; // hangi sütun
  title: string; // danışan
  subtitle: string; // hizmet
  status: string; // pending | confirmed | cancelled
  /** Paletteki sıra; atanmamış randevularda null. */
  /** Hizmetin rengi (#RRGGBB); bilinmiyorsa nötr blok. */
  color: string | null;
}

export default function SlotGrid({
  slots,
  columns,
  items,
  selectedId,
  onSelect,
  onEmptyClick,
  onMove,
  offSlots,
  legend = [],
}: {
  slots: string[];
  columns: SlotColumn[];
  items: SlotItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Boş (veya yalnızca iptal içeren) hücreye tıklanınca. Verilmezse hücre pasiftir. */
  onEmptyClick?: (slot: string, columnKey: string) => void;
  /**
   * Blok başka bir hücreye sürüklendiğinde. Verilmezse sürükleme kapalı.
   *
   * Saat ve sütun birlikte gidiyor: gün görünümünde sütun uzman olduğu
   * için tek bırakma hareketi hem "kime" hem "kaça" sorusunu yanıtlıyor.
   */
  onMove?: (id: number, slot: string, columnKey: string) => void;
  /** Renk lejantı. Boş dizi verilirse çizilmez. */
  legend?: { label: string; color: BlockColor }[];
  /**
   * `slots` içindeki hangi satırlar kliniğin çalışma saati **değil**. Bunlar
   * yalnızca orada bir randevu olduğu için çizilir; boş bırakılsalardı o
   * randevu ekranda hiç görünmezdi.
   */
  offSlots?: ReadonlySet<string>;
}) {
  // Sürüklenen blok ve üzerinde durulan hücre. Hücrenin işaretlenmesi
  // şart: aksi hâlde bırakma anında nereye düşeceği görünmüyor.
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const cell = (slot: string, columnKey: string) =>
    items.filter((i) => i.slot === slot && i.columnKey === columnKey);

  const cellKey = (slot: string, columnKey: string) => `${slot}|${columnKey}`;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        className="wl-table"
        style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}
      >
        <thead>
          <tr>
            <th style={{ width: 64 }}></th>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{c.title}</div>
                {c.sub && (
                  <div style={{ fontSize: 10, color: 'var(--ink-40)', fontWeight: 400 }}>
                    {c.sub}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const off = offSlots?.has(slot) ?? false;
            return (
            <tr key={slot}>
              <td
                className="wl-mono"
                style={{
                  fontSize: 11,
                  color: off ? 'var(--ink-40)' : 'var(--ink-40)',
                  opacity: off ? 0.7 : 1,
                  verticalAlign: 'top',
                }}
                title={off ? 'Çalışma saatleri dışında' : undefined}
              >
                {slot}
                {off && (
                  <span style={{ display: 'block', fontSize: 9, fontStyle: 'italic' }}>
                    saat dışı
                  </span>
                )}
              </td>
              {columns.map((c) => {
                const here = cell(slot, c.key);
                const anahtar = cellKey(slot, c.key);
                const hedef = onMove !== undefined && dragging !== null;
                return (
                  <td
                    key={c.key}
                    className="wl-slot-cell"
                    style={{
                      verticalAlign: 'top',
                      padding: 4,
                      outline: over === anahtar ? '2px solid var(--forest)' : 'none',
                      outlineOffset: -2,
                      background: over === anahtar ? 'var(--forest-3)' : undefined,
                    }}
                    onDragOver={(e) => {
                      if (!hedef) return;
                      // preventDefault olmadan tarayıcı bırakmayı reddediyor.
                      e.preventDefault();
                      setOver(anahtar);
                    }}
                    onDragLeave={() => setOver((o) => (o === anahtar ? null : o))}
                    onDrop={(e) => {
                      if (!hedef || dragging === null) return;
                      e.preventDefault();
                      setOver(null);
                      const id = dragging;
                      setDragging(null);
                      onMove?.(id, slot, c.key);
                    }}
                  >
                    {here.slice(0, MAX_PER_CELL).map((item) => {
                      const color = blockColor(item.color);
                      const cancelled = item.status === 'cancelled';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          // İptal edilmiş randevu taşınamıyor: sunucu da
                          // reddediyor ve sürüklenebilir görünmesi yalan olurdu.
                          draggable={onMove !== undefined && !cancelled}
                          onDragStart={(e) => {
                            setDragging(item.id);
                            e.dataTransfer.effectAllowed = 'move';
                            // Firefox veri olmadan sürüklemeyi başlatmıyor.
                            e.dataTransfer.setData('text/plain', String(item.id));
                          }}
                          onDragEnd={() => {
                            setDragging(null);
                            setOver(null);
                          }}
                          onClick={() => onSelect(item.id)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            font: 'inherit',
                            marginBottom: 4,
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: cancelled ? 'var(--cream)' : color.bg,
                            // Onay bekleyen randevu kesik çerçeveyle ayrılıyor;
                            // dolu zeminde soluk bir ton bunu söyleyemiyor.
                            border: cancelled
                              ? '1px solid var(--bad)'
                              : item.status === 'pending'
                                ? '1px dashed rgba(255, 255, 255, 0.85)'
                                : '1px solid transparent',
                            outline: selectedId === item.id ? '2px solid var(--forest)' : 'none',
                            opacity: cancelled ? 0.55 : dragging === item.id ? 0.4 : 1,
                            cursor: onMove !== undefined && !cancelled ? 'grab' : 'pointer',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: cancelled ? 'var(--bad)' : color.text,
                              textDecoration: cancelled ? 'line-through' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.status === 'completed' && '✓ '}
                            {item.title}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: cancelled ? 'var(--bad)' : color.subtext,
                              textDecoration: cancelled ? 'line-through' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.subtitle}
                          </div>
                        </button>
                      );
                    })}
                    {here.length > MAX_PER_CELL && (
                      <div style={{ fontSize: 10, color: 'var(--ink-40)', paddingLeft: 8 }}>
                        +{here.length - MAX_PER_CELL} randevu
                      </div>
                    )}
                    {/* every() boş dizide true döner: hem tamamen boş hücre hem de
                        yalnızca iptal içeren hücre düğmeyi gösterir — slot gerçekten
                        boştur, iptal kaydı yalnızca geçmişi anlatır.
                        Saat dışı satırlarda düğme yok: backend o saate randevu
                        yazmayı 422 ile reddediyor, düğme kullanıcıyı hataya
                        sürüklerdi. */}
                    {onEmptyClick && !off && here.every((i) => i.status === 'cancelled') && (
                      <button
                        type="button"
                        onClick={() => onEmptyClick(slot, c.key)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          font: 'inherit',
                          fontSize: 10,
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: '1px dashed var(--line)',
                          background: 'transparent',
                          color: 'var(--ink-40)',
                        }}
                      >
                        + Randevu ekle
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>

      {legend.length > 0 && (
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 14, padding: '10px 12px 4px',
            borderTop: '1px solid var(--line)', marginTop: 8,
          }}
        >
          {legend.map((l) => (
            <span
              key={l.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: 'var(--ink-60)',
              }}
            >
              <span
                style={{ width: 10, height: 10, borderRadius: 3, background: l.color.bar }}
              />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
