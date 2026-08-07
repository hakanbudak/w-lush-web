import type { Period } from '../../utils/period';

const OPTIONS: [Period, string][] = [
  ['ay', 'Bu ay'],
  ['ceyrek', 'Çeyrek'],
  ['yil', 'Yıl'],
];

/** Dönem düğmeleri. Tarih hesabı çağıranın işi (bkz. rangeFor). */
export default function PeriodPicker({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div
      style={{
        display: 'flex', background: 'var(--paper)', border: '1px solid var(--line)',
        borderRadius: 8, padding: 3,
      }}
    >
      {OPTIONS.map(([k, lbl]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className="wl-btn wl-btn-sm"
          style={{
            height: 28, borderRadius: 6, fontSize: 12,
            background: value === k ? 'var(--cream-2)' : 'transparent',
            color: value === k ? 'var(--ink)' : 'var(--ink-60)',
          }}
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}
