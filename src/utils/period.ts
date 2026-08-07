// Dönem düğmeleri → somut tarih aralığı. Backend dönem kavramı bilmez,
// yalnız start/end alır; "bu ay"ın ne olduğu arayüzün kararıdır.

export type Period = 'ay' | 'ceyrek' | 'yil';

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Seçili dönemin ilk ve son günü (bugün dahil, yerel takvime göre). */
export function rangeFor(period: Period, today = new Date()): { start: string; end: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  if (period === 'ay') {
    return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  }
  if (period === 'ceyrek') {
    const firstMonth = Math.floor(m / 3) * 3;
    return {
      start: iso(new Date(y, firstMonth, 1)),
      end: iso(new Date(y, firstMonth + 3, 0)),
    };
  }
  return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
}

/** "2026-08" → "Ağu 2026" — aylık seyir barlarının etiketi. */
export const monthLabel = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
};
