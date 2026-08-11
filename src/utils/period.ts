// Dönem düğmeleri → somut tarih aralığı. Backend dönem kavramı bilmez,
// yalnız start/end alır; "bu ay"ın ne olduğu arayüzün kararıdır.

export type Period = 'gun' | 'hafta' | 'ay' | 'yil';

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** JS getDay() → ISO gün numarası (1 = Pazartesi … 7 = Pazar). */
const isoDay = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay());

/**
 * Seçili dönemin ilk ve son günü (bugün dahil, yerel takvime göre).
 *
 * Hafta Pazartesi başlar — kliniğin `open_days` ayarı da ISO gün numarası
 * kullanıyor, iki yerde farklı hafta başlangıcı olması karışıklık yaratırdı.
 */
export function rangeFor(period: Period, today = new Date()): { start: string; end: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  if (period === 'gun') {
    return { start: iso(today), end: iso(today) };
  }
  if (period === 'hafta') {
    const monday = new Date(today);
    monday.setDate(monday.getDate() + 1 - isoDay(today));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { start: iso(monday), end: iso(sunday) };
  }
  if (period === 'ay') {
    return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  }
  return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
}

/** "2026-08" → "Ağu 2026" — aylık seyir barlarının etiketi. */
export const monthLabel = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
};
