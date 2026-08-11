/**
 * Slot ızgarası: satırlar kliniğin slot saatleri, sütunlar çağıranın verdiği
 * eksen (gün görünümünde personel, hafta görünümünde gün).
 *
 * Bileşen veri çekmez ve randevu kavramı bilmez — bu yüzden iki görünüm de
 * aynı bileşeni kullanabiliyor.
 */

const COLORS = [
  { bg: 'var(--forest-3)', bar: 'var(--forest)', text: 'var(--forest-2)' },
  { bg: 'var(--champagne-3)', bar: 'var(--champagne)', text: 'var(--champagne-2)' },
  { bg: 'var(--lavender-soft)', bar: 'var(--lavender)', text: 'var(--lavender-2)' },
  { bg: 'var(--sage-soft)', bar: 'var(--sage)', text: 'var(--sage-2)' },
  { bg: 'var(--cream-2)', bar: 'var(--ink-40)', text: 'var(--ink-60)' },
];

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
  colorIndex: number;
}

export default function SlotGrid({
  slots,
  columns,
  items,
  selectedId,
  onSelect,
}: {
  slots: string[];
  columns: SlotColumn[];
  items: SlotItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const cell = (slot: string, columnKey: string) =>
    items.filter((i) => i.slot === slot && i.columnKey === columnKey);

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
          {slots.map((slot) => (
            <tr key={slot}>
              <td
                className="wl-mono"
                style={{ fontSize: 11, color: 'var(--ink-40)', verticalAlign: 'top' }}
              >
                {slot}
              </td>
              {columns.map((c) => {
                const here = cell(slot, c.key);
                return (
                  <td key={c.key} style={{ verticalAlign: 'top', padding: 4 }}>
                    {here.slice(0, MAX_PER_CELL).map((item) => {
                      const color = COLORS[item.colorIndex % COLORS.length];
                      const cancelled = item.status === 'cancelled';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelect(item.id)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            font: 'inherit',
                            cursor: 'pointer',
                            marginBottom: 4,
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: cancelled ? 'var(--cream)' : color.bg,
                            border:
                              item.status === 'pending'
                                ? '1px dashed var(--line-strong)'
                                : '1px solid transparent',
                            borderLeftWidth: 3,
                            borderLeftStyle: 'solid',
                            borderLeftColor: cancelled ? 'var(--bad)' : color.bar,
                            outline: selectedId === item.id ? '2px solid var(--forest)' : 'none',
                            opacity: cancelled ? 0.55 : 1,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: cancelled ? 'var(--bad)' : 'var(--ink)',
                              textDecoration: cancelled ? 'line-through' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: cancelled ? 'var(--bad)' : color.text,
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
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
