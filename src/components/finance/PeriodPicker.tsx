import type { Period } from '../../utils/period';

const OPTIONS: [Period, string][] = [
  ['gun', 'Bugün'],
  ['hafta', 'Hafta'],
  ['ay', 'Ay'],
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
        display: 'flex', background: 'var(--cream)', borderRadius: 9, padding: 3,
      }}
    >
      {OPTIONS.map(([k, lbl]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className="wl-btn wl-btn-sm"
          style={{
            height: 28, borderRadius: 7, fontSize: 12,
            background: value === k ? 'var(--paper)' : 'transparent',
            color: value === k ? 'var(--ink)' : 'var(--ink-60)',
            boxShadow: value === k ? '0 1px 2px rgba(23,35,61,0.12)' : 'none',
          }}
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}
