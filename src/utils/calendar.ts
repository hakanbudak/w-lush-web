// Takvim ızgarasının tarih hesapları. Finans dönemlerinden (utils/period.ts)
// ayrı: orada dönem aralıkları, burada gün/hafta gezinmesi var.

export const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number): Date => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

/** JS getDay() → ISO gün numarası (1 = Pazartesi … 7 = Pazar). */
export const isoDay = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay());

/** Haftanın ilk günü = Pazartesi (kliniğin open_days'i ISO: 1 = Pazartesi). */
export const startOfWeek = (d: Date): Date => addDays(d, 1 - isoDay(d));

/**
 * Izgaranın satırları: kliniğin slot saatleri + görünen aralıkta gerçekten
 * var olan saatler, kronolojik.
 *
 * Birleşim şart: bir randevunun saati slot listesinde yoksa (klinik çalışma
 * saatlerini sonradan değiştirdiyse, ya da kayıt elle girildiyse) o randevu
 * ızgarada hiç görünmez — sessizce kaybolur. "HH:MM" metinleri sabit
 * genişlikte olduğu için sözlük sırası saat sırasıyla aynıdır.
 */
export function gridRows(
  slots: string[],
  times: string[],
): { rows: string[]; off: Set<string> } {
  const configured = new Set(slots);
  const off = new Set(times.filter((t) => !configured.has(t)));
  return { rows: [...new Set([...slots, ...off])].sort(), off };
}

/** "12 Ağu Sal" — hafta görünümünün sütun başlığı. */
export const dayLabel = (d: Date): string =>
  d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });

/** "12 Ağustos 2026 Salı" — gün görünümünün başlığı. */
export const fullDate = (d: Date): string =>
  d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
